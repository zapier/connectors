# Google Tasks API — gotchas

Behavioral quirks of the public [Google Tasks API v1](https://developers.google.com/workspace/tasks/reference/rest) that the tool/field descriptions can't fully carry. Every claim here is sourced from Google's public documentation (linked inline). Load this when a task/task-list call behaves unexpectedly — dates, ordering, completion, hidden/deleted tasks, subtasks, assigned tasks, limits, or auth errors.

## Due dates are date-only — the time is thrown away

`due` is typed as an RFC 3339 timestamp, but the API records **only the date**:

> "This represents the day that the task should be done … It doesn't represent the deadline of the task. Only date information is recorded; the time portion of the timestamp is discarded when setting this field. It isn't possible to read or write the time that a task is scheduled for using the API."
> — [Task resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks)

So `due` always reads back with a midnight-UTC time component regardless of what you sent. Pass a full timestamp at midnight UTC for the intended day (e.g. `2026-07-01T00:00:00Z`) and read only the date portion. There is no API field for a specific time-of-day or a hard deadline.

## status / completion is server-managed

`status` is `needsAction` or `completed` ([Task resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks)). The `completed` timestamp is set by the server, not by you:

> "Completion date of the task (as a RFC 3339 timestamp). This field is omitted if the task has not been completed."
> — [Task resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks)

Set `status` to `completed` to mark a task done; set it back to `needsAction` to reopen it (the `completed` timestamp then disappears, since it's omitted whenever the task isn't completed). Don't try to write `completed` directly.

## Ordering: `position` is opaque, reorder via move

`position` is **not** an index — it's an opaque lexicographic string:

> "String indicating the position of the task among its sibling tasks … If this string is greater than another task's corresponding position string according to lexicographical ordering, the task is positioned after the other task … Use the 'move' method to move the task to another position."
> — [Task resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks)

Never parse or compute on `position`. To reorder, call `moveTask` with `previous` (the sibling to place the task after). To reparent, call `moveTask` with `parent`. The `parent` field is likewise read-only on the task: "Use the 'move' method to move the task under a different parent or to the top level … This field is read-only." ([Task resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks)).

## Subtasks are exactly one level deep

Google Tasks supports a single level of nesting — a parent task may have subtasks, but a subtask cannot have its own subtasks:

> "tasks that are nested beyond more than one level will no longer be supported … Tasks that are nested beyond one level will automatically be converted to subtasks … Starting August 30, 2019, we will introduce the same structure in the Tasks API"
> — [Upcoming changes to the Google Tasks API (Google Workspace blog)](https://workspace.google.com/blog/product-announcements/upcoming-change-google-tasks-api)

So when calling `createTask`/`moveTask`, only pass a top-level task as `parent`. A user can have up to **2,000 subtasks per task** ([tasks.move](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/move)).

Additional nesting restrictions on `moveTask` / `createTask`:

> "Assigned and repeating tasks cannot be set as parent tasks (have subtasks), or be moved under a parent task (become subtasks)."
> — [tasks.move](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/move)

> "Tasks that are both completed and hidden cannot be nested, so the parent field must be empty."
> — [tasks.move](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/move)

> "An assigned task cannot be a parent task, nor can it have a parent. Setting the parent to an assigned task results in failure of the request."
> — [tasks.insert](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/insert)

## Moving between lists: recurring tasks can't

`moveTask` with `destinationTasklist` moves a task to another list, but:

> "Recurrent tasks cannot currently be moved between lists."
> — [tasks.move](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/move)

## hidden vs deleted — two different "gone" states

- **hidden**: set automatically when a completed task is cleared. "Flag indicating whether the task is hidden. This is the case if the task had been marked completed when the task list was last cleared … This field is read-only." ([Task resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks)). `clearCompletedTasks` is what produces this: "The affected tasks will be marked as 'hidden' and no longer be returned by default when retrieving all tasks for a task list." ([tasks.clear](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/clear)). Hidden tasks are **not** deleted — fetch them again with `showHidden=true`.
- **deleted**: a soft-delete flag, default False ([Task resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks)). Surface soft-deleted tasks with `showDeleted=true`.

Because completed-in-app tasks are marked hidden, retrieving the full completed set needs **both** flags:

> "showHidden must also be True to show tasks completed in first party clients, such as the web UI and Google's mobile apps."
> — [tasks.list](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/list)

`listTasks` pairs `showHidden` with `showCompleted` automatically (unless you set `showHidden` explicitly), so asking for completed tasks returns the complete set.

## listTasks default returns active tasks only (connector override)

The raw API defaults `showCompleted` to **True** ([tasks.list](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/list)), but this connector defaults it to **false** so a plain `listTasks` returns active tasks only. Set `showCompleted=true` to include completed tasks. Other raw defaults: `showHidden`, `showDeleted`, and `showAssigned` are all False ([tasks.list](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/list)).

## Assigned tasks (from Docs / Chat) are special

Tasks can be assigned to a user from Google Docs and Chat Spaces (`assignmentInfo` is populated, read-only) — added to the API on 2024-07-23 ([release notes](https://developers.google.com/workspace/tasks/release-notes); [Task resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks)). Quirks:

- **No notes**: "Tasks assigned from Google Docs cannot have notes." ([Task resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks)).
- **Can't be nested**: see the subtask restrictions above (assigned tasks can't be a parent or a child).
- **Deleting also deletes the source**: "If the task is assigned, both the assigned task and the original task (in Docs, Chat Spaces) are deleted." ([tasks.delete](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/delete)). This applies to `deleteTask` and, transitively, to `deleteTaskList` (which deletes every task in the list). To remove only the assignment, unassign it from the source surface instead.
- Surface them in `listTasks` with `showAssigned=true` (default False).

## No server-side task search

The Tasks API has **no** title/full-text search endpoint — the only read operations are `get` and `list` ([tasks resource methods](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks)). `findTask` works around this by listing and matching titles client-side (paging through `nextPageToken`). It is therefore a best-effort match over what `listTasks` would return, not an indexed search.

## Pagination & page sizes

Both list endpoints page via `nextPageToken` → pass it back as `pageToken`.

- `tasks.list` (`listTasks`): "The default is 20 (max allowed: 100)." ([tasks.list](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/list)).
- `tasklists.list` (`listTaskLists`): "The default is 1000 (max allowed: 1000)." ([tasklists.list](https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists/list)).

(This connector sets its own default of 20 per page for both when `maxResults` is omitted.)

## Resource limits

- **Title**: max 1024 characters — both task and task-list titles ([Task resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks); [TaskList resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists)).
- **Notes**: max 8192 characters ([Task resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks)).
- **Tasks per list**: "A user can have up to 20,000 non-hidden tasks per list and up to 100,000 tasks in total at a time." ([tasks.list](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/list)).
- **Subtasks per task**: up to 2,000 ([tasks.move](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/move)).
- **Task lists per user**: "A user can have up to 2000 lists at a time." ([Tasks API discovery document, `tasklists.insert`](https://github.com/googleapis/google-api-go-client/blob/main/tasks/v1/tasks-api.json)).

## Quota & rate limiting

> "The Tasks API has a courtesy limit of 50,000 queries per day."
> — [Quotas and usage limits](https://developers.google.com/workspace/tasks/limits)

This is a per-Cloud-project quota, adjustable from the Google Cloud console's Quotas page ([limits](https://developers.google.com/workspace/tasks/limits)). On a `429`, or a `403` with reason `rateLimitExceeded` / `userRateLimitExceeded` / `quotaExceeded`, back off and retry with exponential backoff + jitter. (The limits page documents the quota but does not document a `Retry-After` header, so don't depend on one — use client-side backoff.)

## Auth scopes

Two OAuth scopes ([Choose Google Tasks API scopes](https://developers.google.com/workspace/tasks/auth)):

- `https://www.googleapis.com/auth/tasks` — "Create, edit, organize, and delete all your tasks."
- `https://www.googleapis.com/auth/tasks.readonly` — "View your tasks."

Write tools (`createTask`, `updateTask`, `deleteTask`, `moveTask`, `clearCompletedTasks`, and the task-list mutations) need the full `tasks` scope. A `403` with reason `insufficientPermissions` means the connection was granted only `tasks.readonly` (or narrower) — reconnect with the full `tasks` scope. A `401` means the credentials are invalid/expired — reconnect.
