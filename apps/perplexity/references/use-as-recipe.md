# Using Perplexity without tools, terminal, or imports

This is the write-your-own-code path: no pre-registered tools, no terminal/subprocess access, and no way to `import` this package in-process (for example, a code-execution sandbox that only runs snippets you author). If any of those are actually available instead, use [`references/use-as-mcp.md`](use-as-mcp.md), [`references/use-as-cli.md`](use-as-cli.md), or [`references/use-as-sdk.md`](use-as-sdk.md) — this file is only for when none of them are.

<!-- BEGIN:use-as-recipe-content -->

## Auth & base URL

All operations hit `https://api.perplexity.ai` and authenticate the same way: send `Authorization: Bearer <PERPLEXITY_API_KEY>` on every request. Requests with a JSON body also send `Content-Type: application/json`. Below, "your authed request to `<endpoint>`" means an HTTP call with that bearer header (substitute your own HTTP client / transport). For how to obtain and pass the key, see [`use-without-zapier.md`](use-without-zapier.md); for the credential mechanics, see [`SKILL.md`](../SKILL.md#auth).

## Create an agent response (`createAgent`)

`POST /v1/agent`. Body (only `input` is required):

- `input` (string, required) — the question or instruction.
- `instructions` (string) — system-style steering.
- Exactly one of `model` (a `provider/model` id from `listModels`) **or** `preset` (`fast`|`low`|`medium`|`high`|`xhigh`). If you send neither, default to `preset: "medium"`.
- `reasoning_effort`, `max_output_tokens`, `temperature`, `background` (booleans/numbers as named).
- `response_format` — `{ type: "json_schema", json_schema: { name, schema, strict? } }` for typed output.
- **Web search is a tool, not a flag.** To ground the answer, add a `web_search` entry to a `tools` array: `tools: [{ type: "web_search", filters?: { search_domain_filter, search_recency_filter, search_after_date_filter, search_before_date_filter } }]`. Omit `tools` to answer without web search.

Response (fields you'll read): `id`, `status`, `model`, `created_at`, `object`, `usage`, and an `output[]` array. The answer text lives in the `message` output item's content parts (the `output_text` parts, concatenated); the grounding sources live in the `search_results` output item (each with `title`, `url`, `snippet`). This connector pre-derives those into `answer` (string) and `sources[]` for you, but against the raw API you walk `output[]` yourself.

## Poll an agent response (`getAgentResponse`)

`GET /v1/responses/{id}` (equivalently retrieve the response created by `POST /v1/agent`). Path param is the `id` from `createAgent`. Returns the same Response shape as above. Use it to poll a `background: true` run until `status` is terminal, then read the answer. See the background-runs rules in [`perplexity-api-gotchas.md`](perplexity-api-gotchas.md) for the status set and polling contract.

## List models (`listModels`)

`GET /v1/models`. No body. Returns `{ object, data: [{ id, object }, ...] }` where each `id` is a `provider/model` string usable as `createAgent`'s `model`. The set is dynamic — call this rather than hardcoding ids.

## Search the web (`search`)

`POST /search`. Body:

- `query` (required) — a string, **or an array of strings** to run several queries in one request.
- `max_results` (1–20, default 10), `search_domain_filter[]`, `search_recency_filter` (`hour`|`day`|`week`|`month`|`year`), the date filters (`search_after_date_filter`, `search_before_date_filter`, `last_updated_after_filter`, `last_updated_before_filter`), `country` (2-letter ISO), `search_language_filter[]`, `max_tokens_per_page`.

Response: `{ id, results: [{ title, url, snippet, date?, last_updated? }] }`, ranked best-first.

## Error envelope

A failed request returns a non-2xx status; check `res.ok` (or your client's equivalent) and read the status code and body. This connector throws on any non-OK response. For what each status means (401 vs 400 vs 429) and how to recover, see [`perplexity-api-gotchas.md`](perplexity-api-gotchas.md) — don't re-derive it here.

## Critical rules a from-scratch implementation gets wrong

All of these are documented in [`perplexity-api-gotchas.md`](perplexity-api-gotchas.md) — read them there, don't restate:

- Web search is a `tools` entry, **not** a top-level flag.
- Date filters are **`MM/DD/YYYY`**, not ISO (this connector converts ISO for you; a raw caller must not).
- Structured-output schemas need `additionalProperties: false`, a 1–64-char name, and all fields required — and the **first request with a new schema can take 10–30 s / time out**.
- Multi-query `search` costs one billing unit but N rate-limit units.
- `model` and `preset` are mutually exclusive; send exactly one.

<!-- END:use-as-recipe-content -->
