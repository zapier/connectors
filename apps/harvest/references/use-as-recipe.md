# Using Harvest without tools, terminal, or imports

This is the write-your-own-code path: no pre-registered tools, no terminal/subprocess access, and no way to `import` this package in-process (for example, a code-execution sandbox that only runs snippets you author). If any of those are actually available instead, use [`references/use-as-mcp.md`](use-as-mcp.md), [`references/use-as-cli.md`](use-as-cli.md), or [`references/use-as-sdk.md`](use-as-sdk.md) — this file is only for when none of them are.

## Base URL and auth

All calls go to `https://api.harvestapp.com/v2`. Every request carries three headers — send them from your harness's own authed HTTP path:

- `Authorization: Bearer <token>`
- `Harvest-Account-Id: <account id>`
- `User-Agent: <your app name> (<link or email>)`

The `User-Agent` is not optional and the account id selects which Harvest account the token acts on — see [`harvest-api-gotchas.md#auth-headers`](harvest-api-gotchas.md#auth-headers). How to obtain the token + account id is in [`use-without-zapier.md`](use-without-zapier.md#getting-credentials).

## Request patterns

Method + endpoint + input shape per operation family (paths use `{id}` for a path parameter; list filters are query params):

| Operation                        | Method + path                                                                                 | Key inputs                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| List time entries                | `GET /time_entries`                                                                           | `user_id`, `client_id`, `project_id`, `task_id`, `is_running`, `is_billed`, `from`, `to`, `updated_since`, `page`, `per_page` |
| Create time entry (duration)     | `POST /time_entries`                                                                          | `project_id`, `task_id`, `spent_date`, `hours?`, `user_id?`, `notes?`                                                         |
| Create time entry (timestamps)   | `POST /time_entries`                                                                          | `project_id`, `task_id`, `spent_date`, `started_time?`, `ended_time?`, `user_id?`, `notes?`                                   |
| Get / update / delete time entry | `GET`, `PATCH`, or `DELETE /time_entries/{id}`                                                | `id` (+ patch fields)                                                                                                         |
| Stop / restart timer             | `PATCH /time_entries/{id}/stop`, `PATCH /time_entries/{id}/restart`                           | `id`                                                                                                                          |
| Clients                          | `GET /clients`, `POST /clients`, `GET` or `PATCH /clients/{id}`                               | `name` (create); `is_active`, `updated_since` (list filters)                                                                  |
| Projects                         | `GET /projects`, `POST /projects`, `GET` or `PATCH /projects/{id}`                            | `client_id`, `name`, `is_billable`, `bill_by`, `budget_by` (create)                                                           |
| Tasks                            | `GET /tasks`, `POST /tasks`                                                                   | `name` (create)                                                                                                               |
| Project task assignments         | `GET /projects/{project_id}/task_assignments`, `POST /projects/{project_id}/task_assignments` | `project_id`, `task_id`                                                                                                       |
| Contacts                         | `GET /contacts`, `POST /contacts`, `GET`, `PATCH`, or `DELETE /contacts/{id}`                 | `client_id`, `first_name` (create)                                                                                            |
| Invoices                         | `GET /invoices`, `GET /invoices/{id}`                                                         | `updated_since` (list filter)                                                                                                 |
| Company / current user           | `GET /company`, `GET /users/me`, `GET /users`                                                 | —                                                                                                                             |

Two create/patch conventions: send only the fields you want to set (a PATCH changes only the fields present), and JSON-encode the body with `Content-Type: application/json`.

## Response shapes (structural)

Field names + types only — real values vary per account. A time entry:

```
{ id: number, spent_date: string, user: {id,name}, client: {id,name},
  project: {id,name}, task: {id,name}, hours: number, rounded_hours: number,
  notes: string|null, is_running: boolean, timer_started_at: string|null,
  started_time: string|null, ended_time: string|null, billable: boolean,
  is_billed: boolean, is_locked: boolean, locked_reason: string|null,
  approval_status: string|null, created_at: string, updated_at: string }
```

A client: `{ id, name, is_active, address, currency, created_at, updated_at }`. Other resources follow the same `{ id, …, created_at, updated_at }` shape; the id/name fields on nested objects (`user`, `project`, `task`) are what a follow-up call needs. List responses wrap the records array alongside a `links` object and `page`/`next_page`/`per_page` fields.

## Error envelope

Non-2xx responses use conventional HTTP status codes and carry a JSON body — on a `422` a human-readable `{ "message": "..." }`. Treat any non-2xx as an error, read `message` for the reason, and honor `Retry-After` on a `429`. What each status means and how to recover is in [`harvest-api-gotchas.md#errors`](harvest-api-gotchas.md#errors) — don't hard-code your own status handling without reading it.

## Critical rules (pointers)

A from-scratch implementation gets these wrong without the gotchas reference — one home per rule, don't restate:

- **Pick the right create tool for the account's time-tracking mode** — [`#time-modes`](harvest-api-gotchas.md#time-modes).
- **Omit `hours` / `ended_time` to leave a running timer**; stop/restart are state-guarded — [`#running-timers`](harvest-api-gotchas.md#running-timers), [`#timers`](harvest-api-gotchas.md#timers).
- **Archive with `is_active=false`; deletes are constrained/destructive** — [`#archive-vs-delete`](harvest-api-gotchas.md#archive-vs-delete).
- **Resolve a project's `task_id` from its task assignments** — [`#task-assignments`](harvest-api-gotchas.md#task-assignments).
- **Page by following `links.next`, not by incrementing `page`** — [`#pagination`](harvest-api-gotchas.md#pagination).
