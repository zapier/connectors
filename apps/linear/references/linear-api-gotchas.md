# Linear API gotchas

Linear's public API is a single GraphQL endpoint. These are the behaviors a
caller gets wrong most often. Every claim below is sourced to Linear's public
developer docs, linked inline.

## One GraphQL endpoint, POST only

There is exactly one endpoint: `https://api.linear.app/graphql`. Requests are
`POST` with a JSON body carrying the `query`/`mutation` and `variables`. There
are no per-resource REST paths — the operation is in the body.
([Getting started](https://linear.app/developers/graphql#endpoint))

## Auth: personal API key is a _bare_ Authorization header (no `Bearer`)

Linear supports two credential types, and they attach differently:

- **Personal API key** — sent as a bare header with **no** `Bearer` prefix:
  "To authenticate your requests, you need to pass the API key with header:
  `Authorization: <API_KEY>`."
  ([Personal API Keys](https://linear.app/developers/graphql#personal-api-keys))
- **OAuth2 access token** — sent _with_ `Bearer`: "pass it with the header
  `Authorization: Bearer <ACCESS_TOKEN>`."
  ([OAuth](https://linear.app/developers/graphql#oauth))

Prefixing a personal API key with `Bearer` is the most common auth failure.
Linear also gives its credentials distinct prefixes: it "changed the format of
our API keys and OAuth access tokens to include Linear specific prefixes,
`lin_api_` and `lin_oauth_`" so GitHub secret-scanning can detect them (and
"automatically detected and disabled if ever committed to a … public GitHub
repository").
([GitHub Secret Scanning changelog](https://linear.app/changelog/2021-08-19-github-secret-scanning#github-secret-scanning))

OAuth access tokens "are valid for 24 hours" and must be refreshed with the
paired refresh token.
([OAuth 2.0 authentication](https://linear.app/developers/oauth-2-0-authentication#response))

## The error envelope: HTTP 200 can still be a failure

Linear "follows the standard GraphQL error format, returning errors within an
errors array in the response." Critically: "GraphQL queries can partially
succeed with a 200 HTTP status, returning some data while including errors for
failed fields." So **the HTTP status alone is not a success signal** — always
inspect the top-level `errors` array before trusting `data`.
([Error handling](https://linear.app/developers/graphql#error-handling))

Each error carries a `message`, a `path`, and `extensions` that "may contain
additional context such as error codes." Rate-limit errors are the notable
status exception (see below).

## Rate limits (and the one that returns HTTP 400)

Linear rate-limits on two independent axes, both **per authenticated user**
(all keys for the same user share one quota):

- **Request count.** Documented limits: API key **2,500 / hour**, OAuth app
  **5,000 / hour**, unauthenticated **600 / hour**. (Note: the prose on the same
  page also states "up to **5,000 requests per hour**" for API-key auth — the
  page is internally inconsistent; treat the table figures as the authoritative
  breakdown and expect the response headers to be the source of truth.)
- **Query complexity.** API key **3,000,000 points / hour**, OAuth app
  **2,000,000 / hour**, unauthenticated **100,000 / hour**. Additionally, "a
  maximum complexity of a single query at any time to **10,000 points**" — a
  query over that "will always get rejected."

Linear returns live budget in response headers (`X-RateLimit-Requests-*`,
`X-RateLimit-Complexity-*`, `X-Complexity`), and some individual
queries/mutations have their own lower per-endpoint limits.
([Rate limiting](https://linear.app/developers/rate-limiting#api-request-limits))

**When you exceed a limit, the GraphQL response is HTTP `400`** — not 429 — "but
you can catch these by inspecting the `errors` in the response body containing
the `RATELIMITED` error code" (`extensions.code === "RATELIMITED"`).
([Handling rate limit errors](https://linear.app/developers/rate-limiting#handling-rate-limit-errors))

## Pagination: Relay cursors, default page size 50

Lists use Relay-style cursor pagination with `first`/`after` (and
`last`/`before`). Responses expose `nodes` (or `edges`) plus a `pageInfo`
object; page forward by passing `pageInfo.endCursor` as `after` while
`pageInfo.hasNextPage` is true. "The first 50 results are returned by default
without query arguments," and default ordering is by `createdAt`.
([Pagination](https://linear.app/developers/pagination))

Archived resources "are hidden by default from the paginated responses" — pass
`includeArchived: true` to include them.
([Getting started – Archived resources](https://linear.app/developers/graphql#archived-resources))

## IDs: UUIDs, plus a human identifier for issues

Most entities are addressed by UUID. Issues additionally have a **human
identifier** like `ENG-118` (team key + number), and the `issue(id:)` query
accepts either form: "The `id` provided can be either be the uuid returned by
the creation query, or the shorthand id like `BLA-123`."
([Getting started – Creating & Editing Issues](https://linear.app/developers/graphql#creating-and-editing-issues))

The issue human identifier is `<TEAM_KEY>-<number>`; a team's `key` (e.g.
`ENG`) is what prefixes it. (Team `key` is returned by the teams query.)

## Priority is an integer 0–4

Issue `priority` is a number. Linear offers exactly five levels — "No priority,
Low, Medium, High, or Urgent" — with no custom levels.
([Priority docs](https://linear.app/docs/priority#overview)) The numeric mapping
is visible in the filtering examples: `priority: { eq: 1 }` selects **Urgent**,
`priority: { lte: 2 }` returns "urgent and high priority" (so **2 = High**),
`priority: { eq: 4 }` is **Low**, and "issues that haven't been given any
priority (their priority is `0`)" — so **0 = No priority**.
([Filtering](https://linear.app/developers/filtering)) That leaves the remaining
level, `3`, as **Medium**. Effective mapping:

| value | meaning     |
| ----- | ----------- |
| 0     | No priority |
| 1     | Urgent      |
| 2     | High        |
| 3     | Medium      |
| 4     | Low         |

## Workflow-state `type` categories

A workflow state (status) is **team-scoped** and carries a `type` naming its
category. The default per-team set moves through "Backlog > Todo > In Progress >
Done > Canceled," and the documented categories are **Backlog, Unstarted,
Started, Completed, Canceled**, with **Triage** as "an additional status
category," plus a system-managed **Duplicate** status applied automatically to
duplicates.
([Issue status](https://linear.app/docs/configuring-workflows)) The API exposes
these as the state `type` string — e.g. filtering with `state: { type: { eq:
"started" } }`.
([Filtering – Examples](https://linear.app/developers/filtering#examples))

If an issue is created without a `stateId`, "the issue will be assigned to the
team's first state in the Backlog workflow state category. If the 'Triage'
feature is turned on for the team, then the issue will be assigned to the Triage
workflow state."
([Getting started](https://linear.app/developers/graphql#creating-and-editing-issues))

## Attachments are links, not file uploads

`attachmentCreate` links an **external URL** to an issue ("link external
resources to issues") — it is not a file upload; uploading a file is a separate
`fileUpload` flow. The attachment **URL is idempotent per issue**: "if you try
to re-create an attachment with the same URL on the same issue, the original
attachment is updated instead," and you can query an attachment (and its issue)
by URL. An optional `iconUrl` "must be of png or jpg format."
([Attachments](https://linear.app/developers/attachments))

## Markdown surface

Issue descriptions and comment bodies are Markdown. Mentions are created "by
using the plain URL of the resource" (e.g. a profile or issue URL renders as an
`@`-mention), and collapsible sections use `+++ [title]` … `+++`.
([Getting started – Markdown](https://linear.app/developers/graphql#adding-mentions-in-markdown))

## Archiving is reversible

Archiving an issue is Linear's soft delete, not a hard delete: "Archived issues
are still searchable and restorable in the future."
([Issue status – Auto-close and auto-archive](https://linear.app/docs/configuring-workflows#auto-close-and-auto-archive))
