# Runway API — gotchas

Behavior of the Runway API that isn't obvious from the tool schemas. Load this
when a call fails unexpectedly, when a task never finishes, or when an output
URL stops working. Every non-obvious claim links to Runway's public docs.

## Base URL and the version header

- The API is served at `https://api.dev.runwayml.com/v1`.
- The `X-Runway-Version` header selects which version of the API you get — it
  "specif[ies] which version of the API to use." This connector sends it on
  every request, pinned to `2024-11-06`. (The `/v1` in the path is _not_ how the
  API is versioned.)
  ([versioning](https://docs.dev.runwayml.com/api-details/versioning/),
  [using the API](https://docs.dev.runwayml.com/guides/using-the-api/))
- Runway keeps an old version working for **four months after a new version
  ships**, so a version bump is a deliberate, one-line change — you are not
  forced to move the day a new version appears.
  ([versioning](https://docs.dev.runwayml.com/api-details/versioning/))

## Almost everything is asynchronous — submit, then poll

The generate / audio / recipe tools do **not** return a finished asset. They
create a task and return its `id`. Poll `getTask` with that id until the task
reaches a terminal status; `output` (the asset URLs) is populated only then.

- **Poll no faster than every ~5 seconds** — Runway recommends "an interval of
  5 seconds or more." ([SDKs](https://docs.dev.runwayml.com/api-details/sdks/))
- A task "will eventually transition to a `SUCCEEDED`, `CANCELED`, or `FAILED`
  status." ([SDKs](https://docs.dev.runwayml.com/api-details/sdks/))
- The tools expose a convenience `wait: true` that blocks and polls for you.
  Generation can take minutes (video especially), so the default is
  `wait: false` — fire the call, then poll `getTask` yourself. `wait` is a
  connector-side convenience, not a Runway field.

### Task statuses

`PENDING`, `THROTTLED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`. Only the
last three are terminal.

- **`THROTTLED` is not an error — keep polling.** It means you have more tasks
  in flight than your tier's concurrency limit allows: "the task is stored on
  our servers but has not been enqueued for processing," and throttled tasks
  "will be enqueued in approximately the order that they were submitted in."
  Treat it like `PENDING`. ([tiers](https://docs.dev.runwayml.com/usage/tiers/))
- `progress`, when present, is "a number between 0 and 1" while the task runs.
  ([API reference](https://docs.dev.runwayml.com/api/))

## Output URLs expire — download and rehost

The URLs in a succeeded task's `output` array are **ephemeral: they "expire
within 24-48 hours."** Runway expects you to "download the data at this
endpoint and save it to your own storage," and warns "do not expose them
directly in your product." Never persist an output URL as if it were durable.
([outputs](https://docs.dev.runwayml.com/assets/outputs/))

## Failure handling — `failureCode` tells you whether to retry

A `FAILED` task carries a human-readable `failure` and a machine `failureCode`.
Branch on the code — some failures are permanent, some are transient:

| Failure code              | Retry?          | Notes                                                                                                             |
| ------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- |
| `SAFETY.INPUT.*`          | **No**          | Blocked by content moderation. "Credits are not refunded" and "you should not retry these generations" unchanged. |
| `ASSET.INVALID`           | **No**          | A problem with an input asset; "you should not retry these errors." Fix the input.                                |
| `INTERNAL` (or null)      | Yes, with delay | "You may retry these generations, but you should add a delay."                                                    |
| `THIRD_PARTY.UNAVAILABLE` | Yes             | An upstream model provider is down; "you may wait and retry the generations."                                     |

([task failures](https://docs.dev.runwayml.com/errors/task-failures/))

## HTTP errors (the request itself failing)

Distinct from task failures — these come back on the HTTP call, not in a task:

- **400** — bad input. "Expect a JSON response with an `error` member with a
  human-readable explanation of the problem." Fix the request; don't retry blind.
- **401** — "the provided API key is not valid."
- **404** — the referenced resource (e.g. a task id) isn't available.
- **405** — wrong HTTP method for the endpoint.
- **429** — too many requests. Retry-safe with backoff.
- **502 / 503 / 504** — overload / load-shedding. Retry-safe.

When retrying, "implement exponential backoff and jitter" — add "a random delay
of up to 50%" to the retry timing.
([HTTP errors](https://docs.dev.runwayml.com/errors/errors/))

## Rate limits, concurrency, and spend caps are per tier

Your organization's tier sets three separate ceilings. `getOrganization`
reports your current per-model limits; `getCreditUsage` reports spend.

| Tier | Max concurrent generations | Max generations / 24h | Max 30-day credit spend |
| ---- | -------------------------- | --------------------- | ----------------------- |
| 1    | 1                          | 50                    | $100                    |
| 2    | 3                          | 500                   | $500                    |
| 3    | 5                          | 1,000                 | $2,000                  |
| 4    | 10                         | 5,000                 | $20,000                 |
| 5    | 20                         | 25,000                | $100,000                |

"All models within the same modality share the same concurrency limits,
determined by your tier" — so queued image jobs and video jobs draw from
separate pools, but two image models share one. Exceeding the concurrency
limit produces `THROTTLED` tasks (above), not errors.
([tiers](https://docs.dev.runwayml.com/usage/tiers/))

## Input assets — URL vs. data URI size limits

Assets are passed as an **HTTPS URL** or a **base64 data URI**, and the size cap
depends on which:

| Asset | HTTPS URL max | Data URI max |
| ----- | ------------- | ------------ |
| Image | 16 MB         | 5 MB         |
| Video | 32 MB         | 16 MB        |

- Images must be `image/jpeg`, `image/png`, or `image/webp` — **GIF is not
  supported.**
- All URLs "must be HTTPS and must reference a domain name in the hostname
  position, not an IP address." Data URIs use `data:<content-type>;base64,<data>`.

([input assets](https://docs.dev.runwayml.com/assets/inputs/))

## Content moderation for public figures

Image and video generation accept a `contentModeration` object with a
`publicFigureThreshold` of `auto` or `low`. "When set to `low`, the content
moderation system will be less strict about preventing generations that include
recognizable public figures." A `SAFETY.INPUT.*` task failure (above) is what
you get when moderation blocks a generation.
([moderation](https://docs.dev.runwayml.com/api-details/moderation/),
[API reference](https://docs.dev.runwayml.com/api/))

## Credit usage queries are windowed

`getCreditUsage` reports per-day, per-model spend. Dates are UTC `YYYY-MM-DD`;
`startDate` defaults to 30 days before now, and **at most 90 days can be queried
at a time** — widen the range beyond that and the call is rejected. Per-model
`amount` may be negative (a refund).
([API reference](https://docs.dev.runwayml.com/api/))

## Models are chosen per call, and the roster changes often

Most generate tools take a `model` string with **no default — you pick one** —
because Runway adds models frequently and the right one depends on the job.
Because `model` is a free string, a newly released Runway model works without a
connector update. The API currently exposes families including Runway
`gen4` / `gen4.5`, Google `veo`, `gemini_image3_pro` and Gemini Omni Flash,
OpenAI `gpt_image_2`, ElevenLabs Multilingual v2 TTS (29 languages), Seed Audio
1.0 (up to 120s; WAV/MP3/Ogg Opus), ElevenLabs sound effects, dubbing, and voice
isolation, and Act-Two character performance. Check the changelog for the
current roster and each model's accepted `ratio` / `duration` values.
([changelog](https://docs.dev.runwayml.com/api-details/api_changelog/))
