# Harvest API gotchas

Vendor-behavior quirks that aren't obvious from the tool schemas. Every claim here is sourced from Harvest's public [API V2 docs](https://help.getharvest.com/api-v2/). Load this when a call is rejected unexpectedly, when picking between the two time-entry tools, or when a delete/archive doesn't behave as expected.

## Time-tracking mode: duration vs. timestamps {#time-modes}

An account tracks time in exactly **one** of two mutually exclusive modes, and each create tool is only valid in its matching mode:

- **Duration mode** → use `createTimeEntry`. Valid only "when your account is configured to track time via duration."
- **Timestamps mode** → use `createTimeEntryForTimestamps`. Valid only "when your account is configured to track time via start and end time."

The deciding flag is the company's `wants_timestamp_timers`: "You can verify this by … checking if `wants_timestamp_timers` is false" (duration) or "is true" (timestamps). When the mode is unknown, call `getCompany` first and read `wants_timestamp_timers` — sending a duration entry to a timestamps-mode account (or vice versa) is rejected.

Source: [Time Entries](https://help.getharvest.com/api-v2/timesheets-api/timesheets/time-entries/), [Company](https://help.getharvest.com/api-v2/company-api/company/company/).

## Running timers on create {#running-timers}

Both create tools double as "start a timer": "If provided, the time entry will be created with the specified hours and `is_running` will be set to false. **If not provided, hours will be set to `0.0` and `is_running` will be set to true.**" So omit `hours` (duration mode) or `ended_time` (timestamps mode) to leave a **running** timer instead of a finalized entry. `timer_started_at` carries the running-timer start and "Returns `null` for stopped timers."

Source: [Time Entries](https://help.getharvest.com/api-v2/timesheets-api/timesheets/time-entries/).

## Stopping / restarting timers {#timers}

State-guarded — the API rejects the wrong transition:

- **Stop**: "Stopping a time entry is only possible if it's currently running."
- **Restart**: "Restarting a time entry is only possible if it isn't currently running."

To find the entry to stop, list time entries with `is_running=true` (plus a `user_id`) rather than guessing an id.

Source: [Time Entries](https://help.getharvest.com/api-v2/timesheets-api/timesheets/time-entries/).

## Hours are rounded server-side {#rounding}

The `hours` you read back is not necessarily what you sent: `rounded_hours` "is rounded according to the _Time Rounding_ setting in your _Preferences_." Don't assume the stored value equals the submitted value.

Source: [Time Entries](https://help.getharvest.com/api-v2/timesheets-api/timesheets/time-entries/).

## Deleting a time entry {#delete-time-entry}

"Deleting a time entry is only possible if it's not closed and the associated project and task haven't been archived. However, Admins can delete closed entries." So a delete can fail on a closed (approved/invoiced-locked) entry or one whose project/task was archived — and whether it succeeds also depends on the caller's role.

Source: [Time Entries](https://help.getharvest.com/api-v2/timesheets-api/timesheets/time-entries/).

## Archive vs. delete for clients and projects {#archive-vs-delete}

Deletes are constrained and destructive; archiving via `is_active=false` is the safe path this connector exposes:

- **Client**: "Deleting a client is only possible if it has no projects, invoices, or estimates associated with it." For any client with history, set `is_active=false` to archive instead.
- **Project**: a project delete "Deletes a project and any time entries or expenses tracked to it." Harvest's own guidance: "If you don't want the project's time entries and expenses to be deleted, you should archive the project instead."

This connector's `updateClient` / `updateProject` set `is_active=false` to archive; it does not expose the destructive delete.

Source: [Clients](https://help.getharvest.com/api-v2/clients-api/clients/clients/), [Projects](https://help.getharvest.com/api-v2/projects-api/projects/projects/).

## Required fields on create {#required-fields}

- **Client** (`createClient`): only `name` is required. "If not provided, the company's currency will be used" for `currency`, and `is_active` "Defaults to `true`." {#clients}
- **Project** (`createProject`): `client_id`, `name`, `is_billable`, `bill_by`, and `budget_by` are all required — `bill_by` is "The method by which the project is invoiced," `budget_by` "The method by which the project is budgeted." {#projects}
- **Task** (`createTask`): only `name` is required; `billable_by_default` "Defaults to `true`," and `is_default` controls "Whether this task should be automatically added to future projects." {#tasks}

Source: [Clients](https://help.getharvest.com/api-v2/clients-api/clients/clients/), [Projects](https://help.getharvest.com/api-v2/projects-api/projects/projects/), [Tasks](https://help.getharvest.com/api-v2/tasks-api/tasks/tasks/).

## Tasks, projects, and task assignments {#task-assignments}

Tasks are account-level objects; a project references a task through a **project task assignment**, and that assignment is what governs billability on the project: "if set to true, all time tracked on this project for the associated task will be marked as billable." When resolving a `task_id` for a time entry on a specific project, list that project's task assignments (`listProjectTaskAssignments`) — they tell you which tasks are set up on the project and how they'll bill — rather than picking any account-wide task.

Source: [Project Task Assignments](https://help.getharvest.com/api-v2/projects-api/projects/task-assignments/).

## Identity and the current user {#current-user}

`getCurrentUser` maps to `GET /v2/users/me`, which "Retrieves the currently authenticated user." Its `timezone` and `default_hourly_rate` ("The billable rate to use for this user when they are added to a project") are the sensible defaults when logging time on behalf of the connected account. `weekly_capacity` on both the user and company is "in seconds."

Source: [Users](https://help.getharvest.com/api-v2/users-api/users/users/), [Company](https://help.getharvest.com/api-v2/company-api/company/company/).

## List filters {#list-filters}

List endpoints share two filters worth knowing: `is_active` — "Pass `true` to only return active clients and `false` to return inactive clients" (i.e. archived-only) — and `updated_since`, which returns "only … [records] that have been updated since the given date and time" (ISO 8601). Use `updated_since` for incremental syncs.

Source: [Clients](https://help.getharvest.com/api-v2/clients-api/clients/clients/).

## Pagination {#pagination}

"The default and maximum `per_page` value for API requests is `2000`." Harvest uses **cursor-based** pagination: "If the response is using cursor based pagination, `page`, `next_page`, and `previous_page` will always return `null` for all but the first and last pages." So **do not page by incrementing `page`** — "You should always use the pagination URLs provided by the `links` section of a response instead of constructing pagination links yourself." Follow `links.next` to page the tail.

Source: [Pagination](https://help.getharvest.com/api-v2/introduction/overview/pagination/).

## Auth headers {#auth-headers}

Every request needs three headers: `Authorization: Bearer <token>`, `Harvest-Account-Id: <account id>`, and a `User-Agent`. Harvest is explicit that the `User-Agent` is mandatory: "We also require that each request include a `User-Agent` header with both: The name of your application [and] A link to your application or email address." {#user-agent}

Source: [Overview](https://help.getharvest.com/api-v2/introduction/overview/general/).

## Errors and rate limits {#errors}

Harvest uses conventional HTTP status codes. A `422` means "There were errors processing your request. Check the response body for additional information." — the body carries a human-readable `message`. This connector surfaces status + message and adds a recovery hint (401 → reconnect, 403 → permission, 404 → check id, 422 → check field values, 429 → honor `Retry-After`).

**Rate limits** {#rate-limits}: "The rate limit for general API requests is **100 requests per 15 seconds**." The Reports API is separate: "100 requests per 15 minutes." On a `429`, honor the `Retry-After` header.

Source: [Overview](https://help.getharvest.com/api-v2/introduction/overview/general/).
