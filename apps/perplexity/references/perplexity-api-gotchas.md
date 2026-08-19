# Perplexity API gotchas

<!-- BEGIN:api-gotchas-content -->

## Auth & API keys

_Concrete facts an agent needs to call the Perplexity API (`https://api.perplexity.ai`) without surprises. All values below are from Perplexity's public docs (see `metadata.api-docs` in `SKILL.md`)._

- Every request authenticates with a bearer token: `Authorization: Bearer <PERPLEXITY_API_KEY>`. There is no OAuth flow — a single API key is the whole credential.
- Get a key from the **API Keys** page in the Perplexity API Console. You must create an **API group** first (via the console web UI) before you can generate any key. Keys look like `pplx-...`.
- **A key's full value is shown only once, at creation, and cannot be retrieved again** — from any endpoint or from the console. If you lose it, mint a new one. Set a descriptive `token_name` when creating a key; after creation the name is the only way to identify it.
- Keys can also be created/revoked programmatically with `POST /generate_auth_token` and `POST /revoke_auth_token` (both require an existing valid key). Revocation is irreversible.

## Errors: shape & status codes

- HTTP status codes you'll see: **400** (bad request / invalid parameters), **401** (authentication — invalid or missing key), **403** (permission denied), **404** (not found), **429** (rate limit), **500+** (server error).
- A **401** means the key is wrong or unset — fix the credential, don't retry. A **400** means the request body is malformed (bad enum, bad schema, unknown field) — fix the request, don't retry.
- A **429** is transient — retry after a delay (see rate limits). Responses carry a request id in the `X-Request-ID` header; capture it when logging errors for support.

## Rate limits & usage tiers

- **Agent API** limits scale with your cumulative-spend **usage tier** (Tier 0–5, based on lifetime credits purchased, never downgraded):
  - Tier 0: **1 QPS / 50 requests per minute**
  - Tier 1: 3 QPS / 150 rpm
  - Tier 2: 8 QPS / 500 rpm
  - Tier 3: 17 QPS / 1,000 rpm
  - Tier 4–5: 33 QPS / 2,000 rpm
- **Search API** limits are **independent of usage tier**: `POST /search` allows **50 query units per second** with a **burst capacity of 50 query units**, enforced by a leaky-bucket algorithm (burst up to 50 instantly, then refill 1 unit every 20 ms).
- On **429**, retry with **exponential backoff plus jitter**. `429`-rejected requests are not billed. Take advantage of burst capacity for batch work instead of artificially spreading requests.

## Models (`provider/model` ids)

- Models are addressed as **`provider/model`**, e.g. `perplexity/sonar`, `openai/gpt-5.6-sol`, `anthropic/claude-opus-5`. They are grouped by provider (Perplexity, OpenAI, Anthropic, and others).
- The available set is **dynamic** — do not hardcode it. Call `listModels` (`GET /v1/models`) to discover the current ids, then pass one to `createAgent`'s `model` field. Deep-research-capable models appear in that list too.

## Agent request shape

- The Agent API endpoint is `POST /v1/agent` (the connector uses this). `POST /v1/responses` is an accepted OpenAI-compatible alias, and the response can be retrieved by id.
- Required content is `input` (the question/instruction). Steer behavior with `instructions` (system-style guidance).
- Choose **exactly one of `model` or `preset`**. A `preset` is a pre-configured model + search + reasoning profile (`fast`, `low`, `medium`, `high`, `xhigh`) for quick setup; the connector defaults to `medium` when neither is given.
- **Web search is a tool, not a top-level flag.** To ground answers, include a `web_search` entry in the request's `tools` array — e.g. `tools: [{ "type": "web_search" }]`. Omit it to answer from the model's own knowledge only. The connector exposes this as `enable_web_search` (on by default) plus flat `search_*` filters that it folds into the tool's `filters`.
- `reasoning_effort` controls how much internal reasoning the model spends — higher is more thorough but slower and costlier.

## Background runs (long jobs)

- For long tasks (deep research, heavy tool use) set `background: true`. The create call returns **immediately** with a Response object; store its `id` and initial `status`.
- Poll the response by id until it reaches a **terminal** status. Non-terminal statuses are `queued` and `in_progress`; terminal statuses are `completed`, `failed`, `cancelled`, and `incomplete` (`incomplete` = stopped before finishing, e.g. on truncation).
- Branch on the terminal status: read output on `completed`; inspect the `error` object on `failed`; treat `cancelled`/`incomplete` as intentionally/prematurely stopped. Poll with a short sleep (a couple of seconds) between checks.

## Structured output (`response_format`)

- Request typed output with `response_format: { type: "json_schema", json_schema: { name, schema } }`. Only **JSON Schema** structured output is supported.
- Agent API schema constraints: the schema **`name` is required and must be 1–64 alphanumeric characters**; set **`additionalProperties: false`**; and list **all properties in `required`** (make every field required). Avoid recursive/self-referential schemas.
- **First-request delay:** the first request using a _new_ JSON schema incurs a one-time schema-prep cost of **typically 10–30 seconds** before the first token, and **may time out**. Subsequent requests with the same schema are fast. Set a generous timeout the first time.
- The response conforms to the schema unless generation is cut short by `max_output_tokens`. Reinforce the schema in your prompt ("Return the data as a JSON object matching the schema") to improve adherence. **Do not ask for URLs inside the JSON** — models can fabricate links; pull links from the response's `search_results`/`citations` items instead.

## Search API specifics

- `POST /search` returns **ranked** web results as structured data (each result has `title`, `url`, `snippet`, and optional `date` / `last_updated`).
- `max_results` accepts **1–20 and defaults to 10**.
- **Multi-query:** `query` may be a single string or an array of strings run together in one request. Billing and rate limiting use different units — a 5-query request is **one billable request but consumes 5 rate-limit units**. The connector lets you pass several newline-separated lines to form the batch.
- **Date filters use `MM/DD/YYYY`** (`%m/%d/%Y`, e.g. `3/1/2025`) — this applies to `search_after_date_filter` / `search_before_date_filter` / `last_updated_*_filter`. Recency filters use the predefined values `hour`, `day`, `week`, `month`, `year`. (The connector also accepts ISO `YYYY-MM-DD` and converts it for you.) Bias by region with `country` as an ISO 3166-1 alpha-2 code (e.g. `US`).

## Grounding & citations

- When web search runs, the Agent response's `output` array contains a `search_results` item (the grounding sources) alongside the assistant `message` item (the answer text). The connector derives `answer` from the message's `output_text` parts and `sources` from the `search_results` item.
- Tool use (web search, etc.) adds to the metered cost — the response's `usage` object reports `input_tokens`, `output_tokens`, `total_tokens`, and a `cost` breakdown in USD. Prefer this metered value over estimating.

<!-- END:api-gotchas-content -->
