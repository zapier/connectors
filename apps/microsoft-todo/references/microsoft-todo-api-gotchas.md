# microsoft-todo API gotchas

Behavioral notes for the Microsoft Graph v1.0 To Do API (`https://graph.microsoft.com/v1.0/me/todo/...`) that aren't obvious from the tool schemas alone. Every non-obvious claim below links its Microsoft Learn source inline.

## Auth and permissions

- Reads support **both** delegated and application permissions: listing lists/tasks needs `Tasks.Read` (delegated) or `Tasks.Read.All` (application), with `Tasks.ReadWrite` / no application equivalent as the higher-privileged delegated option. ([List lists](https://learn.microsoft.com/en-us/graph/api/todo-list-lists), [List tasks](https://learn.microsoft.com/en-us/graph/api/todotasklist-list-tasks))
- **Creating a task, creating a checklist item, and renaming a task list are delegated-only** — each requires the delegated `Tasks.ReadWrite` permission (work-or-school or personal Microsoft account) and lists **Application: Not supported**. ([Create task](https://learn.microsoft.com/en-us/graph/api/todotasklist-post-tasks), [Update task list](https://learn.microsoft.com/en-us/graph/api/todotasklist-update), [Create checklistItem](https://learn.microsoft.com/en-us/graph/api/todotask-post-checklistitems)) Updating a task is delegated-only (`Tasks.ReadWrite`) when acting on your own tasks, but Microsoft's Update task reference separately documents an application-permission path (`Tasks.ReadWrite.All`) for acting on another user's tasks — don't assume application auth can never write a task. ([Update task](https://learn.microsoft.com/en-us/graph/api/todotask-update))
- Deleting a task list is documented with `Tasks.Read` as its _least_-privileged listed permission and `Tasks.ReadWrite` as the higher option — application permissions are again **Not supported** for delete. ([Delete task list](https://learn.microsoft.com/en-us/graph/api/todotasklist-delete))

## Identifier stability

- A task's `id` is **not** stable across list moves: "By default, this value changes when the item is moved from one list to another." Don't cache a `taskId` across a move — re-resolve it via `listTasks`/`findTask`/`getTask` first. ([todoTask resource](https://learn.microsoft.com/en-us/graph/api/resources/todotask))

## Task lists (`todoTaskList`)

- `wellknownListName` marks a list's built-in role: `none` (user-created), `defaultList` (the built-in **Tasks** list), `flaggedEmails` (the built-in **Flagged email** list — "Tasks from flagged emails are present in this list"), or `unknownFutureValue` (evolvable-enum sentinel; don't use it as a value). ([todoTaskList resource](https://learn.microsoft.com/en-us/graph/api/resources/todotasklist))
- Built-in lists cannot be renamed or deleted: "there are built-in task lists such as **Flagged emails** and **Tasks** which cannot be renamed or deleted." Attempting either against `defaultList`/`flaggedEmails` should be expected to fail. ([todoTaskList resource](https://learn.microsoft.com/en-us/graph/api/resources/todotasklist))
- `displayName` is the only writable field on update — Microsoft's update reference lists no other property. ([Update task list](https://learn.microsoft.com/en-us/graph/api/todotasklist-update))
- **The literal path segment `Tasks` is a well-known alias for the default list**, e.g. `GET /me/todo/lists/Tasks/tasks` — a Microsoft Q&A thread reports it working for listing tasks, listing task lists, creating a task, and (per that same report) update/delete task, but **not** for getting a single task by id: `GET /me/todo/lists/Tasks/tasks/{taskId}` fails with `invalidRequest: Parent folder specified does not contain a Task with given Id`, even though the same call with the list's real id succeeds. (Community tier — not documented on the official `todotasklist`/`todo-list-lists` reference pages, which only show the literal `{todoTaskListId}` placeholder.) Don't assume the alias is interchangeable with a real list id on every endpoint, and don't assume the failure mode is the same generic id-malformed error you'd see elsewhere. ([Microsoft Q&A thread](<https://learn.microsoft.com/en-us/answers/questions/1347191/using-todo-lists(tasks)-works-for-most-queries-but>))

## Task status and dates

- `status` is one of `notStarted`, `inProgress`, `completed`, `waitingOnOthers`, `deferred`. `completedDateTime` is documented as "the date and time in the specified time zone that the task was finished" — it is a `dateTimeTimeZone`, not a plain timestamp. ([todoTask resource](https://learn.microsoft.com/en-us/graph/api/resources/todotask))
- `dateTimeTimeZone` (`dueDateTime`, `reminderDateTime`, `startDateTime`, `completedDateTime`) pairs a naive `dateTime` string (no trailing `Z`/offset, e.g. `2017-08-29T04:00:00.0000000`) with a separate `timeZone` name. `timeZone` accepts Windows time-zone names (e.g. `Pacific Standard Time`) and "the other time zones supported by the calendar API" (IANA-style names are listed as additional accepted values). Always set both fields together. ([dateTimeTimeZone resource](https://learn.microsoft.com/en-us/graph/api/resources/datetimetimezone))
- **`startDateTime`/`dueDateTime` time-of-day can be stripped.** Per a Microsoft Q&A thread (not documented on the official resource page — reported here as an observed, tier-attributed behavior, not official documentation): the time portion of `startDateTime`/`dueDateTime` can be scraped off when creating or modifying a task, even with `timeZone` explicitly set to `UTC`, while `reminderDateTime`/`completedDateTime` aren't affected the same way. Microsoft support's own response called this "a design decision rather than a bug," with no fix or documented workaround beyond the product feedback portal. Because of this, don't assume a round-trip of `startDateTime`/`dueDateTime` preserves the time-of-day you sent — verify by reading the value back. ([Microsoft Q&A thread](https://learn.microsoft.com/en-us/answers/questions/2154557/startdatetime-and-duedatetime-of-todo-task-gets-se))
- `createdDateTime`/`lastModifiedDateTime` are `DateTimeOffset` values, UTC by default (ISO 8601, e.g. `2020-08-18T09:03:05.8339192Z`); a custom zone can be requested via a header rather than the property itself. ([Create task](https://learn.microsoft.com/en-us/graph/api/todotasklist-post-tasks))

## Task body

- `body.contentType` is `text` or `html` (the `itemBody` shape shared with Outlook mail/calendar bodies). ([itemBody resource](https://learn.microsoft.com/en-us/graph/api/resources/itembody))
- On **update** specifically, Microsoft's reference for the `body` field carries an extra note not present on the create page: "Note that only HTML type is supported." If a plain-text body update appears not to take effect, try sending it as `contentType: "html"`. ([Update task](https://learn.microsoft.com/en-us/graph/api/todotask-update))

## Categories

- `categories` is a plain string array, but "each category corresponds to the **displayName** property of an [outlookCategory](https://learn.microsoft.com/en-us/graph/api/resources/outlookcategory) that the user has defined" — it's not a free-form tag; passing a name with no matching Outlook category is unlikely to render as expected in clients even though the API accepts arbitrary strings. ([todoTask resource](https://learn.microsoft.com/en-us/graph/api/resources/todotask); same wording on [Create task](https://learn.microsoft.com/en-us/graph/api/todotasklist-post-tasks))

## Checklist items vs. linked resources

- A `checklistItem` is a subtask ("allows breaking down a complex task into more actionable, smaller tasks"); a `linkedResource` is a pointer back to an external item (e.g. the email a task was created from), not a subtask. They're separate collections on a task — don't conflate "steps" (checklist items) with "links back to source" (linked resources). ([To Do overview](https://learn.microsoft.com/en-us/graph/api/resources/todo-overview), [checklistItem resource](https://learn.microsoft.com/en-us/graph/api/resources/checklistitem))
- `checklistItem` also exposes a server-set `checkedDateTime` (when it was checked off) in addition to `id`, `displayName`, `isChecked`, `createdDateTime`. ([checklistItem resource](https://learn.microsoft.com/en-us/graph/api/resources/checklistitem))

## Pagination

- List responses page server-side: when more results exist, Microsoft Graph returns `@odata.nextLink`, a full URL to the next page; keep following it until it's no longer present. Microsoft's own guidance is to use the whole `@odata.nextLink` URL as-is rather than pulling values out of it: "Don't try to extract the `$skiptoken` or `$skip` value and use it in a different request." ([Paging Microsoft Graph data](https://learn.microsoft.com/en-us/graph/paging))
- `$top` sets the page size; `$skipToken` "returns the next page of results from result sets that span multiple pages." ([Query parameters](https://learn.microsoft.com/en-us/graph/query-parameters))

## Errors

- Errors are a single JSON object: `{ "error": { "code", "message", "innerError": {...} } }`. Treat `code` as the stable, code-able value — Microsoft's own guidance is "you shouldn't take any dependency on the **message** property values because they can change at any time." ([Microsoft Graph errors](https://learn.microsoft.com/en-us/graph/errors))
- Relevant HTTP status codes: `400` malformed/incorrect request, `401` missing/invalid auth, `403` forbidden (insufficient permission or license), `404` resource doesn't exist, `429` throttled. ([Microsoft Graph errors](https://learn.microsoft.com/en-us/graph/errors))

## Rate limiting

- On `429 Too Many Requests`, Microsoft Graph returns a `Retry-After` response header (seconds to wait) and a `{ "error": { "code": "TooManyRequests", ... } }` body. Best practice: wait the `Retry-After` duration, retry, and back off exponentially if no `Retry-After` is present — don't retry immediately, since immediate retries still accrue against usage limits. ([Throttling guidance](https://learn.microsoft.com/en-us/graph/throttling))
- Throttling thresholds vary by scenario (writes throttle more readily than reads) and aren't published per-endpoint for the Outlook/To Do service specifically; the only generally-published cross-service baseline is a combined **130,000 requests per 10 seconds** ceiling that applies across Microsoft Graph services absent a more specific documented limit. ([Service-specific throttling limits](https://learn.microsoft.com/en-us/graph/throttling-limits))
