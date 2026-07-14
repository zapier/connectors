# Use as a recipe (write your own code against the API)

_For a harness that can't load this connector's pre-registered tools, can't run a
terminal or subprocess, and can't `import` this package in-process — e.g. a
code-execution sandbox that only runs snippets you write yourself. This page
teaches the request/response shapes so you can write equivalent HTTP calls
directly against the Google Ads REST API._

If your harness _can_ load MCP tools, run a subprocess, or import an npm
package, prefer one of the other references (see the parent `SKILL.md`'s Setup
table) — they call the connector's own tested code. This page is for when none
of those are available and you must issue the HTTP requests yourself.

## Auth, base URL, developer token — brief

Every call is plain HTTPS against a single version-pinned base URL:

```
https://googleads.googleapis.com/v23
```

Each request needs:

- An `Authorization: Bearer <oauth-access-token>` header (Google OAuth 2.0).
- A `developer-token` header on every call.
- A `login-customer-id` header, only when the account you're operating on is
  reached through a manager (MCC) account.

That's the full mechanism. For _why_ each header is required, what breaks
when one is missing, and how account resolution/hierarchy works, see
[Auth & headers](google-ads-api-gotchas.md#auth--headers) and
[Account hierarchy](google-ads-api-gotchas.md#account-hierarchy) in the
gotchas doc — don't re-derive those rules here, just apply them.

## Request/response shapes by operation family

Everything below is structural: field names and types only. Placeholders like
`<string>` are types, not real values — don't copy an enum member, a limit
number, or an id from this section into working code as if it were vendor
truth. For the actual enum values, defaults, and limits, load the gotchas doc
(pointers are in the Critical rules section below).

### 1. Read via GAQL search

The read surface (arbitrary queries, plus every structured "list" operation)
is one HTTP shape: a POST to the search endpoint scoped to a customer.

```
POST /customers/<customerId>/googleAds:search
Content-Type: application/json
[login-customer-id: <managerCustomerId>]   // only through a manager account

{
  "query": "<GAQL string>",
  "pageToken": "<string>"                  // omit on the first page
}
```

Response:

```json
{
  "results": [ { "<resource>": { "<field>": "<value>", ... }, ... } ],
  "nextPageToken": "<string>",
  "fieldMask": "<string>"
}
```

Each result row is keyed by the resource(s) named in your `SELECT` clause
(e.g. selecting `campaign.id` and `metrics.clicks` produces a row shaped like
`{ campaign: { id: <string> }, metrics: { clicks: <string> } }`). There is no
fixed row schema beyond "mirrors what you selected" — build your own
row-parsing logic per query rather than assuming fixed fields.

Every structured read this connector offers (listing campaigns, ad groups,
ads, conversion actions, customer clients, and building metric reports) is
just a specific GAQL query composed against this same endpoint and shape —
only the `query` string's `SELECT`/`FROM`/`WHERE` differ per operation. If you
need a read this connector doesn't structure for you, compose your own GAQL
query and hit this same endpoint.

### 2. Field discovery

Before composing a query against a resource you haven't used, discover its
valid fields with a separate, unscoped (no customer id, no `FROM`) endpoint:

```
POST /googleAdsFields:search
Content-Type: application/json

{
  "query": "SELECT name, category, selectable, filterable, sortable, data_type WHERE name LIKE '<prefix>.%'"
}
```

Response: a `results` array of field descriptors — each with a `name`,
`category`, `dataType`, and `selectable` / `filterable` / `sortable` booleans
— plus an optional `nextPageToken`.

### 3. Mutates (create / update)

Writes (creating a budget or conversion action, updating a budget, changing a
campaign's status) all go through the same envelope: a POST to a
resource-scoped mutate endpoint carrying one or more operations.

```
POST /customers/<customerId>/<resourceCollection>:mutate
Content-Type: application/json
[login-customer-id: <managerCustomerId>]

{
  "operations": [
    {
      "create": { "<field>": "<value>", ... }
    }
  ]
}
```

or, for an update:

```json
{
  "operations": [
    {
      "updateMask": "<comma-separated field paths>",
      "update": {
        "resourceName": "<string>",
        "<field>": "<value>"
      }
    }
  ]
}
```

`<resourceCollection>` is the REST collection name for the thing you're
writing (e.g. campaigns, campaign budgets, conversion actions — see the
gotchas doc's [Mutate semantics](google-ads-api-gotchas.md#mutate-semantics-create--update)
for the resource-name format). Build `updateMask` from exactly the field
paths you're setting in `update` — nothing else.

Response:

```json
{
  "results": [{ "resourceName": "<string>" }]
}
```

Read `results[0].resourceName` as the identifier of what you just wrote.

## Error-handling pattern

A non-2xx response carries an error envelope, not the success shape above.
Structurally:

```json
{
  "error": {
    "code": "<number>",
    "message": "<string>",
    "status": "<string>",
    "details": [
      {
        "errors": [
          {
            "errorCode": { "<oneOfCategory>": "<string>" },
            "message": "<string>"
          }
        ]
      }
    ]
  }
}
```

Write your error handling to:

1. Check the HTTP status first — don't assume a body shape on network-level
   failures (proxies/edges can return a body that isn't this envelope at all).
2. When it does parse, read `error.details[0].errors[0]` for the specific
   sub-error — that's where the actionable `errorCode` and `message` live, not
   the top-level `error.message`.
3. Branch on the sub-error's `errorCode` category to decide whether to retry,
   fix the request, or surface the message as-is. See
   [Errors](google-ads-api-gotchas.md#errors) in the gotchas doc for the two
   error categories worth special-casing and their fixes.

## Critical rules (pointers — read these before writing queries or mutates)

Every rule below is a **pointer**; the substance lives in the gotchas doc so
it's stated once, precisely, with its source:

- Auth headers and when each is required —
  [Auth & headers](google-ads-api-gotchas.md#auth--headers)
- Manager vs. client accounts, resolving which customer id to operate on —
  [Account hierarchy](google-ads-api-gotchas.md#account-hierarchy)
- GAQL grammar rules (required clauses, one resource per query, date-range
  syntax, field discovery) —
  [GAQL (Google Ads Query Language)](google-ads-api-gotchas.md#gaql-google-ads-query-language)
- Which numeric fields are in micros (and the one exception that isn't) —
  [Micros (money fields)](google-ads-api-gotchas.md#micros-money-fields)
- Update-mask semantics for mutates (what happens to fields you omit) and the
  resource-name format —
  [Mutate semantics](google-ads-api-gotchas.md#mutate-semantics-create--update)
- Error envelope fields and the two recoverable error categories —
  [Errors](google-ads-api-gotchas.md#errors)
- Per-day and per-request operation caps —
  [Rate limits / access tiers](google-ads-api-gotchas.md#rate-limits--access-tiers)
- Status enum values and which transition is irreversible —
  [Status enums](google-ads-api-gotchas.md#status-enums)
- Conversion action types and what's out of scope for this API going forward —
  [Conversion tracking](google-ads-api-gotchas.md#conversion-tracking)
- How the version is pinned and how often it changes —
  [API versioning](google-ads-api-gotchas.md#api-versioning)

Do not restate any of these rules' substance from memory in your generated
code's comments — load the actual section before you rely on it, since the
gotchas doc is the maintained source and this page is not.

## Where to go next

- [google-ads-api-gotchas.md](google-ads-api-gotchas.md#auth--headers) — auth
  header mechanics and account hierarchy
- [google-ads-api-gotchas.md](google-ads-api-gotchas.md#gaql-google-ads-query-language) —
  full GAQL grammar rules before composing a query
- [google-ads-api-gotchas.md](google-ads-api-gotchas.md#micros-money-fields) —
  before writing or interpreting any money field
- [google-ads-api-gotchas.md](google-ads-api-gotchas.md#mutate-semantics-create--update) —
  before writing a create or update operation
- [google-ads-api-gotchas.md](google-ads-api-gotchas.md#errors) — before
  writing error-handling / retry logic
- [google-ads-api-gotchas.md](google-ads-api-gotchas.md#status-enums) —
  before changing a campaign, ad group, ad, or conversion action's status
- [google-ads-api-gotchas.md](google-ads-api-gotchas.md#conversion-tracking) —
  before creating a conversion action or reasoning about offline-conversion /
  Customer Match scope
