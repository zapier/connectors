# Gitlab API gotchas

Vendor behaviors of the GitLab REST API v4 (base `https://gitlab.com/api/v4`, plus the one GraphQL endpoint at `/api/graphql`) that a caller gets wrong without warning. Every claim here is drawn from the public GitLab docs. Recover from an error by reading the JSON body's `message` — see [Error shape](#error-shape).

## Auth: `PRIVATE-TOKEN` header vs OAuth Bearer

An access token (personal, project, or group) authenticates by the `PRIVATE-TOKEN` request header — "Pass the token using the `PRIVATE-TOKEN` header (recommended)". An OAuth 2.0 token authenticates differently: it goes in the `Authorization: Bearer <token>` header (or the `access_token` parameter). The two are not interchangeable headers for the same value — a personal access token is sent as `PRIVATE-TOKEN`, not as a Bearer token (though GitLab also accepts personal/project/group tokens in OAuth-compliant `Authorization: Bearer` form).

```http
PRIVATE-TOKEN: <your_access_token>
```

## Scopes: `api` vs `read_api`

The scope lives on the token the user mints, not on any endpoint. Pick the minimum:

- **`api`** — "Grants complete read and write access to the API for the token's scope. Includes the container registry, the dependency proxy, and the package registry." Required for any write (create/update/merge/commit/comment).
- **`read_api`** — "Grants read access to the API for the token's scope." Enough for the list/get/search/diff/log tools; a write with a `read_api`-only token fails with `403 Forbidden`.

## Identifiers: numeric id vs URL-encoded path, and `iid` vs global id

A project `:id` is either its numeric id **or** its URL-encoded `namespace/project` path. "make sure that the `NAMESPACE/PROJECT_PATH` is URL-encoded. For example, `/` is represented by `%2F`" — so `group/project` becomes `group%2Fproject` (`GET /api/v4/projects/diaspora%2Fdiaspora`). A file path in the repository-files endpoints is likewise URL-encoded (`lib%2Fclass%2Erb`).

Issues and merge requests are addressed by their **project-scoped internal id (`iid`)**, not the global `id`. The merge endpoint documents `merge_request_iid` as "The internal ID of the merge request" — it restarts at 1 per project, so the same `iid` means different records in different projects. Passing a global `id` where an `iid` is expected silently addresses the wrong record or 404s.

## Error shape

A failed request returns a non-2xx status and a JSON body whose `message` carries the reason. A missing required attribute looks like:

```json
{ "message": "400 (Bad request) \"title\" not given" }
```

Validation errors nest per-field arrays under `message`:

```json
{ "message": { "bio": ["is too long (maximum is 255 characters)"] } }
```

Status codes worth branching on:

- **400 Bad Request** — "A required attribute of the API request is missing."
- **401 Unauthorized** — "The user isn't authenticated. A valid user token is necessary." (bad/missing token)
- **403 Forbidden** — "The request isn't allowed." (token lacks the scope or the user lacks permission)
- **404 Not Found** — "A resource couldn't be accessed. For example, an ID for a resource couldn't be found, or the user isn't authorized to access the resource." Note 404 doubles as an authorization signal — a private resource you can't see reads as absent.
- **405 Method Not Allowed** — "The request isn't supported." (see [Merge](#merge-405-when-not-mergeable))
- **409 Conflict** — "A conflicting resource already exists."
- **422 Unprocessable** — "The entity couldn't be processed."
- **429 Too Many Requests** — see [Rate limits](#rate-limits-gitlabcom).

## Pagination: offset headers vs keyset

List endpoints return a bare JSON array plus pagination in **response headers**, not an envelope. Offset pagination takes `page` (default 1) and `per_page` (default 20, max 100). The response carries `x-next-page`, `x-page`, `x-per-page`, `x-prev-page`, `x-total`, and `x-total-pages`, plus `Link` headers with `rel` of `prev`, `next`, `first`, or `last`. To page, follow `x-next-page` until it comes back empty (empty means no more pages).

```http
GET /api/v4/projects/:id/issues?page=2&per_page=100
x-next-page: 3
```

**Keyset pagination** ("more efficient retrieval of pages") is a separate mode, enabled with `pagination=keyset` (with `order_by` and `sort`). It is only supported on selected resources — including Projects — where offset pagination on deep pages is discouraged. For those, follow the `Link` header's `rel="next"` URL rather than incrementing `page`.

## Pipeline create is singular `POST .../pipeline`

Creating a pipeline is `POST /projects/:id/pipeline` — **singular**. Every other pipeline route is plural: list is `GET /projects/:id/pipelines`, get one is `GET /projects/:id/pipelines/:pipeline_id`, retry is `POST /projects/:id/pipelines/:pipeline_id/retry`, cancel is `POST /projects/:id/pipelines/:pipeline_id/cancel`. Posting to `.../pipelines` (plural) to create is a common mistake.

- **retry** — "Retries failed or canceled jobs in a pipeline. If there are no failed or canceled jobs in the pipeline, calling this endpoint has no effect." It keeps the jobs that already passed.
- **cancel** — "returns a success response 200 regardless of the pipeline's state," cancelling all jobs within it. So a 200 from cancel does not prove there was anything running to cancel.

## Merge: 405 when not mergeable

`PUT /projects/:id/merge_requests/:merge_request_iid/merge` returns specific failure codes:

| HTTP  | Message                                    | Reason                                                             |
| ----- | ------------------------------------------ | ------------------------------------------------------------------ |
| `400` | `SHA must be provided when merging`        | The "require a commit SHA" setting is on but no `sha` was sent.    |
| `401` | `401 Unauthorized`                         | "This user does not have permission to accept this merge request." |
| `405` | `405 Method Not Allowed`                   | "The merge request cannot merge."                                  |
| `409` | `SHA does not match HEAD of source branch` | The `sha` you passed no longer matches the source HEAD.            |
| `422` | `Branch cannot be merged`                  | "The merge request failed to merge."                               |

The **`405`** is the one to handle: it means the MR is not in a mergeable state right now (conflicts, unresolved requirements, a not-yet-passed pipeline, or unmet approvals). Don't retry blindly — re-read the MR, resolve the blocker, then merge.

The **`sha` guard**: "If present, this SHA must match the HEAD of the source branch. Use to ensure that only reviewed commits are merged." Pass the head `sha` you read from the MR so the merge only proceeds if the branch hasn't moved under you; a mismatch is the `409` above.

On projects with **merge trains** enabled, a merge call may route the request onto the train instead of merging directly — pass `auto_merge=true` for the train, or `skip_merge_train=true` to merge directly.

## Rate limits (gitlab.com)

GitLab.com enforces: "Authenticated API traffic for a user: 2,000 requests each minute" and "Unauthenticated traffic from an IP address: 500 requests each minute." "When a request is rate limited, GitLab responds with a `429` status code" (plain-text body `Retry later` by default), with informational rate-limit headers on the response. Back off and retry on `429` rather than hammering. Self-managed and Dedicated instances set their own limits.

## Work items are GraphQL-only; REST epics are deprecated

There is no stable REST surface for epics/work items. "The Epics REST API was deprecated in GitLab 17.0 and is planned for removal in v5 of the API. From GitLab 17.4 to 18.0, if the new look for epics is enabled, and in GitLab 18.1 and later, use the Work Items API instead." Work items (epics, tasks, objectives, issues-as-work-items) are managed through the GraphQL endpoint at `/api/graphql` via a widget-based model. A GraphQL response is always HTTP 200 even on failure — errors arrive in a top-level `errors` array, so check `errors` before trusting `data`.

## Premium/Ultimate-gated surfaces

Some features return empty or error on Free tiers:

- **Advanced Search** — the `blobs` (code) and `commits` search scopes require GitLab Advanced Search, a Premium/Ultimate feature.
- **Required-approval gates** and **work items (epics)** are Premium/Ultimate surfaces.

## Raw file and job log return text, not JSON

`GET /projects/:id/repository/files/:file_path/raw` "Retrieves the raw file contents" — plain bytes, "unlike the standard file retrieval which returns Base64-encoded content." `GET /projects/:id/jobs/:job_id/trace` returns "a job log (trace)" as the raw log text. Don't `JSON.parse` either response; read it as text.
