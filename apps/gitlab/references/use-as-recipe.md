# Using Gitlab without tools, terminal, or imports

This is the write-your-own-code path: no pre-registered tools, no terminal/subprocess access, and no way to `import` this package in-process (for example, a code-execution sandbox that only runs snippets you author). If any of those are actually available instead, use [`references/use-as-mcp.md`](use-as-mcp.md), [`references/use-as-cli.md`](use-as-cli.md), or [`references/use-as-sdk.md`](use-as-sdk.md) — this file is only for when none of them are.

## Base URL and auth

Every call is an authed HTTPS request to `https://gitlab.com/api/v4/...` (host is configurable for self-managed / Dedicated). "Authed" here means your own authenticated HTTP path — see [`references/gitlab-api-gotchas.md`](gitlab-api-gotchas.md#auth-private-token-header-vs-oauth-bearer) for how GitLab expects the credential (a `PRIVATE-TOKEN` header for access tokens). The one non-REST surface is work items, at `POST https://gitlab.com/api/graphql` with a `{ query, variables }` JSON body.

Two things pervade every request and are covered once in the gotchas file rather than repeated per operation:

- **`projectId`** is a numeric id or a URL-encoded `group/project` path; URL-encode it in the path. Issues and MRs are addressed by project-scoped `iid`, not global id. See [identifiers](gitlab-api-gotchas.md#identifiers-numeric-id-vs-url-encoded-path-and-iid-vs-global-id).
- **List responses** are a bare JSON array plus pagination in headers; follow `x-next-page`. See [pagination](gitlab-api-gotchas.md#pagination-offset-headers-vs-keyset).

## Request patterns (representative)

Method + endpoint + input shape, distilled from the scripts. Auth is your authed request in every row.

| Operation            | Method + endpoint                                        | Input                                                                                        |
| -------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| List/search projects | `GET /projects`                                          | `search?`, `page?`, `per_page?`                                                              |
| List issues          | `GET /projects/:id/issues`                               | `state?`, `labels?`, `assignee?`, `milestone?`                                               |
| Create issue         | `POST /projects/:id/issues`                              | `title`, `description?` (GLFM), `labels?`, `assignee_ids?`, `milestone_id?`                  |
| Get MR               | `GET /projects/:id/merge_requests/:iid`                  | —                                                                                            |
| Merge MR             | `PUT /projects/:id/merge_requests/:iid/merge`            | `sha?`, `squash?`, `merge_commit_message?`                                                   |
| Diff comment         | `POST /projects/:id/merge_requests/:iid/discussions`     | `body`, `position{ new_path, new_line, base_sha, head_sha, start_sha }`                      |
| Commit files         | `POST /projects/:id/repository/commits`                  | `branch`, `commit_message`, `actions[]` (`create`/`update`/`delete`/`move`), `start_branch?` |
| Read raw file        | `GET /projects/:id/repository/files/:file_path/raw?ref=` | path URL-encoded; returns **text**                                                           |
| Create pipeline      | `POST /projects/:id/pipeline`                            | `ref`, `variables?` — note the **singular** path                                             |
| Job log              | `GET /projects/:id/jobs/:job_id/trace`                   | returns **text**                                                                             |
| Work items           | `POST /api/graphql`                                      | `{ query, variables }`                                                                       |

## Response shapes (structural)

Field names/types from the scripts' output schemas — structure only, not example values.

- **List tools** → `{ items: T[], nextPage: number | null }`. E.g. `listIssues` items: `{ iid: number, title: string, state?: string, ... }`; `listProjects` items: `{ id: number, path_with_namespace: string, name?, web_url?, default_branch? }`.
- **`getMergeRequest`** → `{ iid, title, description?, state?, source_branch?, target_branch?, merge_status?, web_url?, sha? }` — carry `sha` and the diff refs into the merge / diff-comment calls.
- **`createIssue`** → `{ iid, title, state?, web_url? }`.
- **Raw file / job log** → a text body, not JSON.

## Error handling

A non-2xx response carries a JSON body with a `message` field. Read it; don't assume 2xx. For what each status code means and how to recover (e.g. the merge `405`, the `sha` `409`, `read_api` `403`s), see [`references/gitlab-api-gotchas.md`](gitlab-api-gotchas.md#error-shape).

## Critical rules a from-scratch caller gets wrong

These are pointers, not restatements — read the linked sections before implementing:

- Pipeline **create** is the singular `POST .../pipeline` — [gotchas](gitlab-api-gotchas.md#pipeline-create-is-singular-post-pipeline).
- Merge returns **405 when the MR isn't mergeable**; guard with `sha` — [gotchas](gitlab-api-gotchas.md#merge-405-when-not-mergeable).
- Work items are **GraphQL-only** (REST epics deprecated), and GraphQL returns 200-with-`errors` — [gotchas](gitlab-api-gotchas.md#work-items-are-graphql-only-rest-epics-are-deprecated).
- Any description/comment body is **GitLab Flavored Markdown** (blank-line paragraph breaks, `#`/`!`/`@` references) — [formatting](gitlab-formatting.md).
