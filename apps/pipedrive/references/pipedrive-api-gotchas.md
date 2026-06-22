# Pipedrive API gotchas

Agent-facing notes for the behaviors this connector wraps that aren't obvious from
field names. Everything here is from the public Pipedrive API docs (links inline).
The connector talks to both API **v2** (`/api/v2/...`) and API **v1** (`/v1/...`);
several gotchas come from the differences between them.

## Response envelope & error convention

Every endpoint wraps its payload in a shared envelope. On success you get
`success: true` and the record/array under `data`, with list metadata under
`additional_data`:

```json
{
  "success": true,
  "data": null,
  "additional_data": {
    "pagination": {
      "start": 0,
      "limit": 100,
      "more_items_in_collection": false
    }
  }
}
```

On failure you get `success: false` with `error` and `error_info` instead of data:

```json
{
  "success": false,
  "error": "Requested service is not available",
  "error_info": "Please check developers.pipedrive.com",
  "data": null,
  "additional_data": null
}
```

The docs state: "All responses include a `success` boolean field; when `success: false`,
the response contains `error` and `error_info` messages instead of data." This connector
treats a non-2xx status **or** `success: false` as an error and surfaces `error`/`error_info`
in the thrown message — read `error_info` for the actionable detail.
Source: [Requests and responses](https://pipedrive.readme.io/docs/core-api-concepts-responses).

## Authentication

Two methods: an **API token** (sent in the `x-api-token` header) or **OAuth 2.0**
(Bearer access token) for apps. An API token "is tied to a specific user and company,
giving access to all user's data." Requests route through a company-specific domain
like `https://companydomain.pipedrive.com/api/...`.
Source: [API token / authentication](https://pipedrive.readme.io/docs/core-api-concepts-authentication).

## HTTP status → recovery

- **400** — the request is malformed or a field value is invalid. Check `error_info`
  and the field formats (see id formats below).
- **401** — token missing or expired; reconnect the account. "All requests to our API
  need authentication"
  ([auth](https://pipedrive.readme.io/docs/core-api-concepts-authentication)).
- **403** — the token lacks permission/scope, or an account/plan limit was hit. A 403
  limit error carries an extra `code` field, e.g.
  `"error": "Couldn't add the deal. Open deals limit reached.", "code": "feature_capping_deals_limit"`
  ([responses](https://pipedrive.readme.io/docs/core-api-concepts-responses)). Clients that
  ignore 429s and keep flooding "will also get the 403 response code"
  ([rate limiting](https://pipedrive.readme.io/docs/core-api-concepts-rate-limiting)).
- **404** — no such record; the id is wrong or it was already deleted.
- **410 / endpoint gone** — a `/v1/...` endpoint may have been removed. Pipedrive
  deprecated a set of v1 endpoints (Activities, Deals, Persons, Organizations, Products,
  Pipelines, Stages, Search) that "will remain accessible until December 31, 2025. After
  this date, their availability and functionality will no longer be guaranteed." Switch to
  the v2 equivalent.
  Source: [Deprecation of selected API v1 endpoints](https://developers.pipedrive.com/changelog/post/deprecation-of-selected-api-v1-endpoints).
- **429** — rate limited; back off and retry (see below).

## Rate limits & retry headers

Limits are token-based per `access_token`/`api_token`, enforced over a rolling
**2-second window**. Responses carry:

- `x-ratelimit-limit` — "The maximum number of requests current `access_token` or
  `api_token` can perform per 2-second window."
- `x-ratelimit-remaining` — "The number of requests left for the 2-second window."
- `x-ratelimit-reset` — "The remaining window before the rate limit resets."
- `x-daily-requests-left` — for `api_token` requests only.

"Once the daily budget is fully depleted, all further API requests will be rejected with
a 429 (Too Many Requests) status code." On a 429, wait for the `x-ratelimit-reset`
interval before retrying. (Note: the docs document `x-ratelimit-*`; a standard
`Retry-After` header is not documented, so prefer `x-ratelimit-reset`.)
Source: [Rate limiting](https://pipedrive.readme.io/docs/core-api-concepts-rate-limiting).

## Pagination: cursor (v2) vs offset (v1)

The two API versions paginate differently — match the tool to its style:

- **Cursor (all v2 list endpoints).** Pass `cursor`, "a marker (an opaque string value)
  representing the first item on the next page." The response returns `next_cursor`;
  when it is `null`/absent there are no more pages. Connector tools expose this as
  `next_cursor`. (listDeals, listActivities, listPersons, listOrganizations, listProducts,
  listStages, listPipelines, listDealProducts, and the v2 `search*` tools.)
- **Offset (v1 endpoints).** Pass `start` (offset; "If omitted, the default value is 0")
  and `limit` ("the number of items shown per page"). The response's `additional_data.pagination`
  carries `next_start` and `more_items_in_collection`. Connector tools expose `next_start`.
  (listLeads, listNotes, listDealParticipants, the `list*Fields` tools, and searchLeads.)

"All v2 API list endpoints" use cursor-based pagination, while "the rest of our GET
endpoints" use offset.
Source: [Pagination](https://pipedrive.readme.io/docs/core-api-concepts-pagination).

## API v1 vs v2 (and what changed)

Some tools call `/api/v2/...` and some call `/v1/...` because not every resource has a v2
endpoint yet (leads, notes, deal participants, and the field-definition endpoints are v1).
Two v1↔v2 differences leak into responses:

- **Timestamps.** "All timestamps in the v2 API are now in RFC 3339 format (e.g.
  `2024-01-01T00:00:00Z`)." v1 returns space-separated UTC, e.g. Product `add_time`
  goes from `"2021-01-11 17:30:10"` (v1) to `"2021-01-11T17:30:10Z"` (v2). This connector
  normalizes v1 timestamps to RFC 3339 (appends `Z`) on the v1-backed tools.
- **Custom-field option ids.** Single-option (`enum`) ids went from strings to numbers
  (`"123"` → `123`); multi-option (`set`) from a comma string to an array (`"123,456"` →
  `[123, 456]`). `visible_to` likewise became integers (`"1"` → `1`).

Source: [API v2 migration guide](https://pipedrive.readme.io/docs/pipedrive-api-v2-migration-guide).

## ID formats

- **Most records use integer ids** (deals, persons, organizations, products, activities,
  notes, users, stages, pipelines, deal-product line items).
- **Leads use a UUID.** The Lead `id` field has format `uuid`
  ([Leads](https://developers.pipedrive.com/docs/api/v1/Leads)). `getLead`, `updateLead`,
  and the `lead_id` params take the UUID, not an integer.
- **Custom-field keys are 40-character hashes.** "All custom fields are referenced as
  randomly generated 40-character hashes in the dataset, for example,
  `dcf558aac1ae4e8c4f849ba5e668430d8df9be12`"
  ([custom fields](https://pipedrive.readme.io/docs/core-api-concepts-custom-fields)).
  They appear as keys in the `custom_fields` object.

## Custom fields

Custom field values live under `custom_fields`, keyed by the 40-char hash. To discover the
key for a named field, call the matching tool — `listDealFields`, `listPersonFields`,
`listOrganizationFields`, `listProductFields` — which maps each field's label to its key
(retrievable "via the API endpoints: `/dealFields`, `/personFields`, `/organizationFields`,
`/productFields`"). For `enum` (single) and `set` (multiple) fields, **write the option id,
not the label** — the field definition's `options` array gives you id↔label. Only these
custom field types are searchable: "`address`, `varchar`, `text`, `varchar_auto`, `double`,
`monetary` and `phone`."
Source: [custom fields](https://pipedrive.readme.io/docs/core-api-concepts-custom-fields).

## Search constraints

The `search*` tools wrap Pipedrive's search endpoints. Common rules:

- **`term` minimum length:** "Minimum 2 characters (or 1 if using `exact_match`)."
- **`exact_match`:** "When enabled, only full exact matches against the given term are
  returned. It is not case sensitive."
- **`fields`** restricts which fields are matched, and the set differs per entity:
  - Deals: `custom_fields`, `notes`, `title`.
  - Persons: `custom_fields`, `email`, `notes`, `phone`, `name`.
  - Organizations: `name`, `address`, `notes`, `custom_fields`.
  - Products: `name`, `code`, `custom_fields`.
- The `term` must be URL-encoded (the connector handles this).

Sources:
[Search Deals](https://developers.pipedrive.com/docs/api/v1/Deals),
[Search Persons](https://developers.pipedrive.com/docs/api/v1/Persons).
Search hits are summaries — call the matching `get*` tool with the hit's id for the full
record.

## Date / datetime formats on inputs

- **Dates** (`expected_close_date`, activity `due_date`): `YYYY-MM-DD`.
- **Activity `due_time`:** the v1 docs describe it as a UTC time string in `HH:MM` format
  (not `HH:MM:SS`) ([Activities](https://developers.pipedrive.com/docs/api/v1/Activities)).
- **Activity `type`:** pass the activity type's `key_string`, not its display name. "The
  `key_string` will be generated by the API based on the given name of the activity type
  upon creation, and cannot be changed," and types link via "ActivityType.key_string =
  Activity.type" ([ActivityTypes](https://developers.pipedrive.com/docs/api/v1/ActivityTypes)).
  Discover it via `listActivityTypes`.

## Leads vs deals: value shape

A lead's monetary value is a nested object — "The potential value of the lead represented
by a JSON object: `{ "amount": 200, "currency": "EUR" }`. Both amount and currency are
required" ([Leads](https://developers.pipedrive.com/docs/api/v1/Leads)) — unlike a deal,
which carries a flat numeric `value` plus a separate `currency`. Discover valid currency
codes via `listCurrencies`.
