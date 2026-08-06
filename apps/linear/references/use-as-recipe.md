# Using Linear without tools, terminal, or imports

This is the write-your-own-code path: no pre-registered tools, no terminal/subprocess access, and no way to `import` this package in-process (for example, a code-execution sandbox that only runs snippets you author). If any of those are actually available instead, use [`references/use-as-mcp.md`](use-as-mcp.md), [`references/use-as-cli.md`](use-as-cli.md), or [`references/use-as-sdk.md`](use-as-sdk.md) — this file is only for when none of them are.

## Shape of every call

Linear is a single GraphQL endpoint. Every operation is one `POST` to
`https://api.linear.app/graphql` with a JSON body `{ query, variables }`, using
your own authed HTTP path (`Authorization` header — see
[`use-without-zapier.md`](use-without-zapier.md) for the credential and
[`linear-api-gotchas.md`](linear-api-gotchas.md#auth-personal-api-key-is-a-bare-authorization-header-no-bearer)
for the bare-key-vs-`Bearer` rule). There are no REST paths; the operation lives
in the body's GraphQL string.

```
POST https://api.linear.app/graphql
Content-Type: application/json
{ "query": "<query or mutation>", "variables": { ... } }
```

Mutations wrap their payload in an `input` object and return
`{ success, <entity> { ... } }`; queries return the entity (or a `nodes[]`
connection) directly under `data`.

## Per-operation recipes

Input shapes below come from each script's own schema. `Id` fields are UUIDs
unless noted; the `issueId` fields accept **either** a UUID or the human
identifier (e.g. `ENG-118`) — see the gotchas ID section.

### Create / update / read an issue

```
mutation IssueCreate($input: IssueCreateInput!) {
  issueCreate(input: $input) { success issue { id identifier title url } }
}
# $input: { teamId, title, description?, priority?, assigneeId?, stateId?,
#           labelIds?, projectId?, projectMilestoneId?, cycleId?, parentId?,
#           dueDate?, estimate? }

mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
  issueUpdate(id: $id, input: $input) { success issue { id identifier title url } }
}
# $id is the issue UUID or identifier; $input carries only the fields you change.
# assigneeId / projectId / dueDate accept null to CLEAR the field.

query Issue($id: String!) {
  issue(id: $id) {
    id identifier title url description priority estimate dueDate createdAt updatedAt
    state { id name type } assignee { id name email } team { id name key }
    project { id name } labels { nodes { id name color } }
  }
}
```

Response shape (create/update): `{ id, identifier, title, url }`. Full issue read
adds `description`, `priority` (int), `dueDate`, `state {id,name,type}`,
`assignee`, `team {id,name,key}`, `project`, and a `labels` connection you
flatten from `labels.nodes`. `priority` is an integer — its meaning is in the
[gotchas priority table](linear-api-gotchas.md#priority-is-an-integer-04).
`state.type` category values are in the
[workflow-state section](linear-api-gotchas.md#workflow-state-type-categories).

### Labels, archive, comments, attachments on an issue

```
mutation IssueAddLabel($id: String!, $labelId: String!) {
  issueAddLabel(id: $id, labelId: $labelId) { success issue { id identifier title url } }
}
mutation IssueRemoveLabel($id: String!, $labelId: String!) {
  issueRemoveLabel(id: $id, labelId: $labelId) { success issue { id identifier title url } }
}
# add/remove are single-label and additive — they don't replace the label set.

mutation IssueArchive($id: String!) { issueArchive(id: $id) { success } }
# archive is Linear's reversible soft delete — see the gotchas archiving note.

mutation CommentCreate($input: CommentCreateInput!) {
  commentCreate(input: $input) { success comment { id url } }
}
# $input: { issueId, body }   (body is Markdown)

mutation AttachmentCreate($input: AttachmentCreateInput!) {
  attachmentCreate(input: $input) { success attachment { id url title } }
}
# $input: { issueId, url, title?, subtitle? }
# Attachments link a URL; they are not file uploads — see the gotchas attachments note.
```

### Projects and project updates

```
mutation ProjectCreate($input: ProjectCreateInput!) {
  projectCreate(input: $input) { success project { id name url } }
}
# $input: { name, teamIds, description?, leadId?, startDate?, targetDate? }
#   teamIds is an array (one or more team UUIDs).

mutation ProjectUpdate($id: String!, $input: ProjectUpdateInput!) {
  projectUpdate(id: $id, input: $input) { success project { id name url state } }
}
# $input.state is one of: "planned" | "started" | "paused" | "completed" | "canceled"

mutation ProjectUpdateCreate($input: ProjectUpdateCreateInput!) {
  projectUpdateCreate(input: $input) { success projectUpdate { id url } }
}
# $input: { projectId, body, health? }
#   health is one of: "onTrack" | "atRisk" | "offTrack"

query Project($id: String!) { project(id: $id) { id name description url state } }
```

### List / lookup operations (resolve names → ids)

All lists take `{ filter?, first?, after? }` and return a Relay connection you
map to `{ items, nextCursor, hasMore }` from `nodes` + `pageInfo`:

```
query Teams($first: Int, $after: String) {
  teams(first: $first, after: $after) {
    nodes { id name key } pageInfo { hasNextPage endCursor }
  }
}
query Users($filter: UserFilter, $first: Int, $after: String) {
  users(filter: $filter, first: $first, after: $after) {
    nodes { id name email displayName } pageInfo { hasNextPage endCursor }
  }
}
query Viewer { viewer { id name email displayName } }   # the authenticated "me"

query WorkflowStates($filter: WorkflowStateFilter, $first: Int, $after: String) {
  workflowStates(filter: $filter, ...) { nodes { id name type } pageInfo { ... } }
}
query IssueLabels($filter, $first, $after) { issueLabels(...) { nodes { id name color } ... } }
query Projects($filter: ProjectFilter, ...) { projects(...) { nodes { id name state url } ... } }
query Cycles($filter: CycleFilter, ...) { cycles(...) { nodes { id name number startsAt endsAt } ... } }
query ProjectMilestones($id, $first, $after) {
  project(id: $id) { projectMilestones(...) { nodes { id name targetDate } ... } }
}
```

`workflowStates`, `cycles`, and (team-scoped) `issueLabels` are filtered by
`team: { id: { eq } }`; `issues` search builds an `IssueFilter` from
`title: { contains }`, `team`/`assignee`/`state`/`project` `id: { eq }`, and
`labels: { some: { id: { eq } } }`. `users` name/email search uses
`containsIgnoreCase`. Default page size is Linear's own — see the
[pagination gotcha](linear-api-gotchas.md#pagination-relay-cursors-default-page-size-50).

### Search issues

```
query Issues($filter: IssueFilter, $first: Int, $after: String) {
  issues(filter: $filter, first: $first, after: $after) {
    nodes { id identifier title url state { name } assignee { name } }
    pageInfo { hasNextPage endCursor }
  }
}
```

Return `{ issues: nodes, nextCursor: hasNextPage ? endCursor : null, hasMore }`.

## Error handling

Read the JSON body regardless of HTTP status. Treat the response as a failure
when the top-level `errors` array is present and non-empty:

```
{ "data": { ... } | null, "errors": [ { "message", "path", "extensions": { "code", ... } } ] }
```

A `200` can still carry `errors` (partial success), and rate limiting comes back
as **HTTP 400** with `extensions.code === "RATELIMITED"`. What the codes mean and
how to react is in
[`linear-api-gotchas.md`](linear-api-gotchas.md#the-error-envelope-http-200-can-still-be-a-failure)
— don't infer recovery from the HTTP status alone.

## Critical rules (pointers)

- Auth header form (bare key vs `Bearer`) and key prefixes →
  [gotchas: auth](linear-api-gotchas.md#auth-personal-api-key-is-a-bare-authorization-header-no-bearer).
- 200-with-`errors` and the 400 `RATELIMITED` case →
  [gotchas: error envelope](linear-api-gotchas.md#the-error-envelope-http-200-can-still-be-a-failure)
  and [rate limits](linear-api-gotchas.md#rate-limits-and-the-one-that-returns-http-400).
- Cursor pagination + default page size + `includeArchived` →
  [gotchas: pagination](linear-api-gotchas.md#pagination-relay-cursors-default-page-size-50).
- Issue id vs identifier, priority ints, workflow-state `type`, attachments-are-links,
  archiving-is-reversible → the matching gotchas sections above.
