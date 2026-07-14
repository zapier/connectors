# Reference implementation: writing your own code against the Google Tasks API

This reference is for a harness that cannot load this connector's pre-registered tools, cannot run a terminal/subprocess, and cannot `import` this package in-process (e.g. a code-execution sandbox that only runs code you write yourself). It distills the request/response shapes, call patterns, and error handling this connector's 13 scripts use, so you can write equivalent code directly against the vendor API.

For everything about _invoking the pre-built scripts_ instead (an MCP-aware client, terminal/subprocess, or importing the package), see the other files this SKILL.md's Setup table points to. For anything about how the Google Tasks API actually _behaves_ (dates, ordering, limits, quotas, auth scopes...), this file only points at [google-tasks-api-gotchas.md](google-tasks-api-gotchas.md) — read it before writing logic that depends on a specific quirk; the rule itself lives there, not here.

## Auth & base URL

All requests go to `https://tasks.googleapis.com/tasks/v1`. Authenticate with a Google OAuth 2.0 access token, sent as your HTTP client's standard bearer credential. Which scope each operation needs, and how to handle `401`/`403` responses, is covered in the gotchas doc — see [Auth scopes](google-tasks-api-gotchas.md#auth-scopes).

## Request/response shape patterns

Two resources, `TaskList` and `Task`, plus one client-side pattern (`findTask`) that has no dedicated endpoint. The shapes below are structural — field name and type, not a populated example. Any bound (max length, page size, resource count) is a vendor fact already covered in the gotchas doc; follow the pointer rather than hardcode a number here.

### TaskList shape

```
TaskList {
  id?: string | null       // task-list id; pass as {tasklist} on task calls
  title?: string | null    // bounded — see Resource limits
  updated?: string | null  // RFC3339 timestamp, server-set
}
```

### Task-list operations

| Operation       | Method + path                        | Body                                               | Response                                                         |
| --------------- | ------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------- |
| List            | `GET /users/@me/lists`               | — (query: `maxResults`, `pageToken`)               | `{ items?: TaskList[] \| null, nextPageToken?: string \| null }` |
| Get             | `GET /users/@me/lists/{tasklist}`    | —                                                  | `TaskList`                                                       |
| Create          | `POST /users/@me/lists`              | `{ title }`                                        | `TaskList`                                                       |
| Update (rename) | `PATCH /users/@me/lists/{tasklist}`  | `{ title }` — only send the fields you're changing | `TaskList`                                                       |
| Delete          | `DELETE /users/@me/lists/{tasklist}` | —                                                  | empty body on success — see Error handling below                 |

`{tasklist}` and `{task}` are opaque ids returned by a prior List/Get/Create call — URL-encode them into the path.

### Task shape

```
Task {
  id?: string | null
  title?: string | null        // bounded — see Resource limits
  notes?: string | null        // bounded — see Resource limits; some tasks can't carry notes — see Assigned tasks
  status?: "needsAction" | "completed" | null
  due?: string | null           // RFC3339 timestamp — see Due dates
  completed?: string | null     // RFC3339 timestamp, server-set — see status / completion
  deleted?: boolean | null      // server-set
  hidden?: boolean | null       // server-set — see hidden vs deleted
  parent?: string | null        // read-only on the resource — see Ordering
  position?: string | null      // opaque, read-only — see Ordering
  updated?: string | null       // RFC3339 timestamp, server-set
  webViewLink?: string | null
  links?: Array<{ type?: string | null; description?: string | null; link?: string | null }> | null
}
```

### Task operations

| Operation       | Method + path                              | Query params                                                                                                                                              | Body                                                                                                       | Response                                                     |
| --------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| List            | `GET /lists/{tasklist}/tasks`              | `showCompleted`, `showHidden`, `showDeleted`, `showAssigned`, `dueMin`, `dueMax`, `completedMin`, `completedMax`, `updatedMin`, `maxResults`, `pageToken` | —                                                                                                          | `{ items?: Task[] \| null, nextPageToken?: string \| null }` |
| Get             | `GET /lists/{tasklist}/tasks/{task}`       | —                                                                                                                                                         | —                                                                                                          | `Task`                                                       |
| Create          | `POST /lists/{tasklist}/tasks`             | `parent`, `previous` (both optional — place the new task)                                                                                                 | `{ title?, notes?, status?, due? }`                                                                        | `Task`                                                       |
| Update          | `PATCH /lists/{tasklist}/tasks/{task}`     | —                                                                                                                                                         | `{ title?, notes?, status?, due? }` — only send the fields you're changing; anything omitted is left alone | `Task`                                                       |
| Move            | `POST /lists/{tasklist}/tasks/{task}/move` | `parent`, `previous`, `destinationTasklist` (all optional)                                                                                                | — (no body)                                                                                                | `Task`                                                       |
| Delete          | `DELETE /lists/{tasklist}/tasks/{task}`    | —                                                                                                                                                         | —                                                                                                          | empty body on success                                        |
| Clear completed | `POST /lists/{tasklist}/clear`             | —                                                                                                                                                         | — (no body)                                                                                                | empty body on success                                        |

Every parameter above (`showCompleted`, `showHidden`, `maxResults`, etc.) is optional on the wire; this connector fills in its own defaults for the ones you omit. Write your own defaults deliberately rather than assuming they match the vendor's raw defaults — see [listTasks default returns active tasks only](google-tasks-api-gotchas.md#listtasks-default-returns-active-tasks-only-connector-override) for what this connector chose and why.

### Client-side find (no server-side search)

There is no title/search endpoint on the vendor API. To resolve a task by title yourself: call List repeatedly, paging via `nextPageToken` (cap the number of pages you're willing to walk), and match titles case-insensitively — an exact match wins immediately; otherwise keep the first case-insensitive substring match you see and return it if nothing exact turned up. Report which kind of match you found (exact / substring / none) so the caller can decide whether to disambiguate between ties. See [No server-side task search](google-tasks-api-gotchas.md#no-server-side-task-search) for why this is necessary.

## Error handling

Check the response status on every call before touching the body — don't assume a body is present or JSON-parseable:

- Treat any non-2xx response as a failure. Surface the HTTP status and which operation failed (method + path), so a caller can tell what went wrong. What a given status/reason means and how to respond to it — expired credentials, insufficient scope, rate limiting — is in the gotchas doc: see [Auth scopes](google-tasks-api-gotchas.md#auth-scopes) and [Quota & rate limiting](google-tasks-api-gotchas.md#quota--rate-limiting).
- On success, Delete and Clear-completed return an empty body — don't run a JSON parser over them; return your own success sentinel (e.g. `{ success: true }`) instead. Every other operation returns the resource (`Task` or `TaskList`) as its JSON body — parse and return it as-is.

## Critical rules — read before writing logic that depends on these

Each of these is a real API behavior, sourced and detailed in the gotchas doc — this recipe only points at it so the rule has one home and can't drift out of sync:

- **Due dates** — before reading or writing `due`. → [Due dates are date-only](google-tasks-api-gotchas.md#due-dates-are-date-only--the-time-is-thrown-away)
- **Status / completion** — before setting `status` or reading `completed`. → [status / completion is server-managed](google-tasks-api-gotchas.md#status--completion-is-server-managed)
- **Ordering** — before trying to reorder or reparent by writing `position`/`parent` directly. → [Ordering: position is opaque](google-tasks-api-gotchas.md#ordering-position-is-opaque-reorder-via-move)
- **Subtask nesting** — before nesting a task under a parent. → [Subtasks are exactly one level deep](google-tasks-api-gotchas.md#subtasks-are-exactly-one-level-deep)
- **Cross-list moves** — before moving a task with `destinationTasklist`. → [Moving between lists: recurring tasks can't](google-tasks-api-gotchas.md#moving-between-lists-recurring-tasks-cant)
- **Hidden vs. deleted** — before deciding which `show*` flags to set on List. → [hidden vs deleted](google-tasks-api-gotchas.md#hidden-vs-deleted--two-different-gone-states)
- **Assigned tasks** (from Docs/Chat) — before writing `notes` or deleting a task that might be assigned. → [Assigned tasks are special](google-tasks-api-gotchas.md#assigned-tasks-from-docs--chat-are-special)
- **Resource limits** — before assuming a title, notes body, or list count will be accepted. → [Resource limits](google-tasks-api-gotchas.md#resource-limits)
- **Pagination** — before picking a page size or assuming what "all results" means. → [Pagination & page sizes](google-tasks-api-gotchas.md#pagination--page-sizes)
- **Rate limits** — before calling the API in a tight loop. → [Quota & rate limiting](google-tasks-api-gotchas.md#quota--rate-limiting)

## Where to go next

- [google-tasks-api-gotchas.md](google-tasks-api-gotchas.md) — the full index of API behavior referenced above:
  - [Due dates are date-only — the time is thrown away](google-tasks-api-gotchas.md#due-dates-are-date-only--the-time-is-thrown-away)
  - [status / completion is server-managed](google-tasks-api-gotchas.md#status--completion-is-server-managed)
  - [Ordering: position is opaque, reorder via move](google-tasks-api-gotchas.md#ordering-position-is-opaque-reorder-via-move)
  - [Subtasks are exactly one level deep](google-tasks-api-gotchas.md#subtasks-are-exactly-one-level-deep)
  - [Moving between lists: recurring tasks can't](google-tasks-api-gotchas.md#moving-between-lists-recurring-tasks-cant)
  - [hidden vs deleted — two different "gone" states](google-tasks-api-gotchas.md#hidden-vs-deleted--two-different-gone-states)
  - [listTasks default returns active tasks only (connector override)](google-tasks-api-gotchas.md#listtasks-default-returns-active-tasks-only-connector-override)
  - [Assigned tasks (from Docs / Chat) are special](google-tasks-api-gotchas.md#assigned-tasks-from-docs--chat-are-special)
  - [No server-side task search](google-tasks-api-gotchas.md#no-server-side-task-search)
  - [Pagination & page sizes](google-tasks-api-gotchas.md#pagination--page-sizes)
  - [Resource limits](google-tasks-api-gotchas.md#resource-limits)
  - [Quota & rate limiting](google-tasks-api-gotchas.md#quota--rate-limiting)
  - [Auth scopes](google-tasks-api-gotchas.md#auth-scopes)
