# Calling Microsoft Graph directly (no tools, no terminal, no import)

This is the write-your-own-code shape: you can't load this connector's
pre-registered tools, can't run a terminal or subprocess, and can't `import`
this package in-process — you write and execute code yourself (for example, in
a code-execution sandbox) that calls the Microsoft Graph To Do API directly.
This reference teaches the request/response shapes this connector's 16
scripts encode (task lists, tasks, checklist items) so you can reproduce the
same calls in your own code.

For everything about _how the Microsoft Graph To Do API itself behaves_ —
auth/permissions, id stability, list built-ins, date-time/time-zone handling,
paging, and error recovery — this file only points into
[`microsoft-todo-api-gotchas.md`](microsoft-todo-api-gotchas.md); it doesn't
restate it. Read the linked section before you rely on a specific behavior.

## Auth & base URL

- Every call targets the Microsoft Graph **v1.0** REST API at
  `https://graph.microsoft.com/v1.0`.
- Every request carries a single OAuth 2.0 bearer token as an
  `Authorization: Bearer <token>` header against your own authed request path
  (e.g. a sandbox's own `fetch`-like primitive) — there's no separate
  bot/service credential to juggle, just one token per request.
- Which scope a given call needs (reads vs. writes, delegated vs.
  application) is a vendor fact, not this file's job — see
  [Auth and permissions](microsoft-todo-api-gotchas.md#auth-and-permissions)
  before you request a token.

## Request/response shapes, by operation family

Each entry below is an HTTP method + path pattern and the field names this
connector's own request/response schemas use. Shapes here are **structural**
(field name + type only) — they ship as mechanism, not as vendor-behavior
claims. For what a field's real values, limits, or defaults actually are,
follow the linked gotchas section rather than assuming the shape below is
exhaustive or that any example value is the only one Graph accepts.

One path placeholder recurs:

- `{listId}` — a task list's id. On `createTask`/`listTasks`/`findTask` this
  connector lets you omit `listId` and substitutes the literal path segment
  `Tasks` instead, addressing the default list without a prior lookup. Every
  other task/checklist call needs a real, `encodeURIComponent`-escaped
  `listId` resolved first via a `listLists` call.

### Task lists

- `GET /me/todo/lists?$top=<number>` (first page) — Response: `{ items:
<TaskList[]>, next_cursor?: <string> }`; when `next_cursor` (Graph's
  `@odata.nextLink`) is present, fetch that full URL verbatim for the next
  page instead of rebuilding the query. Where a `TaskList` is `{ id:
<string>, displayName: <string>, wellknownListName?: <"none" |
"defaultList" | "flaggedEmails">, isOwner?: <boolean>, isShared?: <boolean>
}`.
- `GET /me/todo/lists/{listId}` — Response: a single `TaskList`.
- `POST /me/todo/lists` — body: `{ displayName: <string> }`. Response: the
  created `TaskList`.
- `PATCH /me/todo/lists/{listId}` — body: `{ displayName: <string> }` (the
  only writable field). Response: the updated `TaskList`.
- `DELETE /me/todo/lists/{listId}` — no body. Graph returns `204 No Content`;
  synthesize `{ success: true }` once the request doesn't error.

`wellknownListName` values and which lists can't be renamed/deleted are vendor
facts — see
[Task lists](microsoft-todo-api-gotchas.md#task-lists-todotasklist) before you
branch on them.

### Tasks

A `Task` (the shape every task-returning call agrees on) is: `{ id: <string>,
title: <string>, body?: { content?: <string>, contentType?: <"text" |
"html"> }, importance?: <"low" | "normal" | "high">, status: <"notStarted" |
"inProgress" | "completed" | "waitingOnOthers" | "deferred">, isReminderOn?:
<boolean>, dueDateTime?: <DateTimeTimeZone>, reminderDateTime?:
<DateTimeTimeZone>, startDateTime?: <DateTimeTimeZone>, completedDateTime?:
<DateTimeTimeZone>, createdDateTime?: <string>, lastModifiedDateTime?:
<string>, categories?: <string[]> }`, where a `DateTimeTimeZone` is `{
dateTime: <string>, timeZone: <string> }`.

- `GET /me/todo/lists/{listId}/tasks?$top=<number>&$filter=<string>&
$orderby=<string>` (first page) — Response: `{ items: <Task[]>, next_cursor?:
<string> }`; refetch a present `next_cursor` (Graph's `@odata.nextLink`)
  verbatim for the next page, same as task lists above. A find-by-title
  convenience wraps the same endpoint, building `$filter=title eq '<escaped
title>'` (optionally `and status ne 'completed'`) server-side instead of
  taking a raw OData string.
- `GET /me/todo/lists/{listId}/tasks/{taskId}` — Response: a single `Task`.
- `POST /me/todo/lists/{listId}/tasks` — body: a partial `Task` (only
  `title` is required). Response: the created `Task`.
- `PATCH /me/todo/lists/{listId}/tasks/{taskId}` — body: a partial `Task`
  carrying only the fields you're changing (e.g. `{ status: "completed" }` to
  mark done, `{ status: "notStarted" }` to reopen). Response: the updated
  `Task`.
- `DELETE /me/todo/lists/{listId}/tasks/{taskId}` — no body. Graph returns
  `204 No Content`; synthesize `{ success: true }`.

The `$filter`/`$orderby` OData syntax, what `status` transitions do to
`completedDateTime`, the `dueDateTime`/`startDateTime` time-of-day caveat, and
what a task id surviving (or not) a list move means for caching are all
vendor facts — see
[Task status and dates](microsoft-todo-api-gotchas.md#task-status-and-dates),
[Identifier stability](microsoft-todo-api-gotchas.md#identifier-stability),
and [Task body](microsoft-todo-api-gotchas.md#task-body) before you build a
create/update body or cache an id.

### Checklist items (steps)

A `ChecklistItem` is `{ id: <string>, displayName: <string>, isChecked:
<boolean>, createdDateTime?: <string> }`.

- `GET /me/todo/lists/{listId}/tasks/{taskId}/checklistItems?$top=<number>`
  (first page) — Response: `{ items: <ChecklistItem[]>, next_cursor?:
<string> }`; refetch a present `next_cursor` verbatim for the next page,
  same as above.
- `POST /me/todo/lists/{listId}/tasks/{taskId}/checklistItems` — body: `{
displayName: <string>, isChecked?: <boolean> }`. Response: the created
  `ChecklistItem`.
- `PATCH /me/todo/lists/{listId}/tasks/{taskId}/checklistItems/
{checklistItemId}` — body: a partial `ChecklistItem` (`displayName?`,
  `isChecked?`). Response: the updated `ChecklistItem`.
- `DELETE /me/todo/lists/{listId}/tasks/{taskId}/checklistItems/
{checklistItemId}` — no body. Graph returns `204 No Content`; synthesize `{
success: true }`.

Checklist items are subtasks, distinct from a task's `linkedResources`
(pointers back to an external source) — see
[Checklist items vs. linked resources](microsoft-todo-api-gotchas.md#checklist-items-vs-linked-resources)
before conflating the two.

## Error-handling pattern

Every operation above funnels through the same two-step pattern: issue the
HTTP request and raise/branch on any non-2xx response, then — for calls that
return a body — parse it as JSON. The `DELETE` operations above return no
body on success (`204 No Content`); treat "request didn't raise" as success
there, the way this connector's scripts synthesize their own `{ success:
true }`.

The actual shape of an error response — a single JSON `error` object with a
machine-readable `code` and a `message`, the status codes you'll see, and how
to recover from each (including the `429`/`Retry-After` backoff) — is a
vendor fact, not a connector invention. Don't reconstruct it from guesswork:
see [Errors](microsoft-todo-api-gotchas.md#errors) and
[Rate limiting](microsoft-todo-api-gotchas.md#rate-limiting).

## Critical rules

These are vendor-behavior facts your own code needs to get right; each is
sourced and explained in the gotchas doc, not repeated here:

- **A task id doesn't survive a list move.** See
  [Identifier stability](microsoft-todo-api-gotchas.md#identifier-stability)
  before caching or re-using a `taskId` across calls.
- **Built-in lists can't be renamed or deleted, and app-only (application)
  auth can't create/update/delete anything.** See
  [Auth and permissions](microsoft-todo-api-gotchas.md#auth-and-permissions)
  and [Task lists](microsoft-todo-api-gotchas.md#task-lists-todotasklist).
- **`dueDateTime`/`startDateTime` may not round-trip the time-of-day you
  sent.** See
  [Task status and dates](microsoft-todo-api-gotchas.md#task-status-and-dates).
- **Update-only body quirk: only `contentType: "html"` is documented as
  supported when patching a task's `body`.** See
  [Task body](microsoft-todo-api-gotchas.md#task-body).
- **Paging cursors follow Microsoft's own `@odata.nextLink` convention —
  this connector surfaces the full, opaque link as `next_cursor` and
  refetches it verbatim, rather than extracting and reusing a `$skiptoken`
  value (which Microsoft's own guidance warns against).** See
  [Pagination](microsoft-todo-api-gotchas.md#pagination).
- **Error envelope, status codes, and throttling backoff** are in
  [Errors](microsoft-todo-api-gotchas.md#errors) and
  [Rate limiting](microsoft-todo-api-gotchas.md#rate-limiting).

No vendor-behavior assertion in this file goes beyond what's already sourced
in the gotchas doc above — this run didn't need to add a new claim.

## Where to go next

- [`microsoft-todo-api-gotchas.md`](microsoft-todo-api-gotchas.md) — the full
  set of vendor-behavior rules pointed to above:
  [Auth and permissions](microsoft-todo-api-gotchas.md#auth-and-permissions),
  [Identifier stability](microsoft-todo-api-gotchas.md#identifier-stability),
  [Task lists](microsoft-todo-api-gotchas.md#task-lists-todotasklist),
  [Task status and dates](microsoft-todo-api-gotchas.md#task-status-and-dates),
  [Task body](microsoft-todo-api-gotchas.md#task-body),
  [Categories](microsoft-todo-api-gotchas.md#categories),
  [Checklist items vs. linked resources](microsoft-todo-api-gotchas.md#checklist-items-vs-linked-resources),
  [Pagination](microsoft-todo-api-gotchas.md#pagination),
  [Errors](microsoft-todo-api-gotchas.md#errors),
  [Rate limiting](microsoft-todo-api-gotchas.md#rate-limiting).
- [`../SKILL.md`](../SKILL.md) — the full 16-script catalog and the
  `listId`-optional/required rules per script.
