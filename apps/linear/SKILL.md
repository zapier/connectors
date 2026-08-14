---
name: linear
description: Agent-callable Linear tools — create, update, find, and comment on issues; manage projects; and resolve teams, states, labels, users, and cycles. Use when the user mentions Linear or wants to track issues, even if they don't name Linear explicitly.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/linear/SKILL.md
  title: Linear
  api-docs: https://linear.app/developers/graphql
  zapier-app-key: LinearCLIAPI
---

# Linear

<!-- BEGIN:skill-intro -->

Tools for working with Linear over the [Linear GraphQL API](https://linear.app/developers/graphql) (`POST https://api.linear.app/graphql`): create and update issues, comment on them and attach links, find issues by identifier or filter, manage projects and post project updates, and resolve the teams, workflow states, labels, users, milestones, and cycles an agent needs to act. 22 scripts across issue writes, issue reads, projects, and workspace navigation. This version covers the day-to-day issue-tracking job over the public API; every tool builds one GraphQL query or mutation and posts it to the single endpoint.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Linear. Not affiliated with, endorsed by, or sponsored by Linear. "Linear" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:skill-intro -->

## When to use this

<!-- BEGIN:skill-use-cases -->

- An agent needs to **create or update issues** — open an issue in a team; change its title, description, state, assignee, priority, project, cycle, or due date; add or remove a single label; comment on it; or attach a link (a related ticket, doc, or PR).
- An agent needs to **find or read issues** — fetch one by UUID or human identifier (e.g. `ENG-118`), or search by title text, assignee, state, team, project, or label, then read its comment thread.
- An agent needs to **manage projects** — create or update a project, read one, list projects, and post a status update with a health signal.
- An agent needs to **resolve names to ids before writing** — list teams, workflow states, labels, users, project milestones, and cycles, or get the authenticated "me" identity for assign-to-self / "my issues" flows.

<!-- END:skill-use-cases -->

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill linear` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

Want the actual repo source instead — to browse `references/`, run this connector's tests, or hack on it? See [`README.md`](README.md#cloning-the-source) for a scoped `git clone`.

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                 | Load                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__linear__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                           | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                  | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Linear API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

<!-- BEGIN:skill-connections-note? -->

Every script uses the single connection `linear`. Grouped below as issue writes, issue reads, projects, and workspace navigation; ids everywhere are UUIDs, except the issue tools (`getIssue`, `updateIssue`, `archiveIssue`, `addIssueLabel`, `removeIssueLabel`, `createComment`, `createAttachment`, `listIssueComments`) also accept an issue's human identifier (e.g. `ENG-118`).
<!-- END:skill-connections-note -->

<!-- BEGIN:skill-scripts-table -->

| Script                                                                 | Script name                                       | Connections | Description                                                                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`scripts/createIssue.ts`](scripts/createIssue.ts)                     | `createIssue` (Create Issue)                      | `linear`    | Create a Linear issue in a team, with optional assignee, state, labels, project, cycle, priority, and due date.                                        |
| [`scripts/updateIssue.ts`](scripts/updateIssue.ts)                     | `updateIssue` (Update Issue)                      | `linear`    | Update an existing Linear issue's fields — title, description, state, assignee, priority, project, cycle, or due date.                                 |
| [`scripts/archiveIssue.ts`](scripts/archiveIssue.ts)                   | `archiveIssue` (Archive Issue)                    | `linear`    | Archive a Linear issue. This is Linear's reversible "delete" — the issue is recoverable from the archive, not hard-deleted.                            |
| [`scripts/addIssueLabel.ts`](scripts/addIssueLabel.ts)                 | `addIssueLabel` (Add Issue Label)                 | `linear`    | Add a single label to a Linear issue without disturbing its other labels (additive, unlike replacing the full label set).                              |
| [`scripts/removeIssueLabel.ts`](scripts/removeIssueLabel.ts)           | `removeIssueLabel` (Remove Issue Label)           | `linear`    | Remove a single label from a Linear issue, leaving its other labels intact.                                                                            |
| [`scripts/createComment.ts`](scripts/createComment.ts)                 | `createComment` (Create Comment)                  | `linear`    | Post a Markdown comment on a Linear issue.                                                                                                             |
| [`scripts/createAttachment.ts`](scripts/createAttachment.ts)           | `createAttachment` (Create Attachment)            | `linear`    | Attach a link (URL) to a Linear issue — e.g. a related ticket, doc, or PR. Linear attachments are link-based, not file uploads.                        |
| [`scripts/getIssue.ts`](scripts/getIssue.ts)                           | `getIssue` (Get Issue)                            | `linear`    | Fetch a single Linear issue by its UUID or identifier, with its state, assignee, team, project, and labels.                                            |
| [`scripts/searchIssues.ts`](scripts/searchIssues.ts)                   | `searchIssues` (Search Issues)                    | `linear`    | Find Linear issues by title text, assignee, state, team, project, or label. Returns a page of compact rows plus a cursor.                              |
| [`scripts/listIssueComments.ts`](scripts/listIssueComments.ts)         | `listIssueComments` (List Issue Comments)         | `linear`    | List the comments on a Linear issue. Returns a page of comments plus a cursor. Pairs with `createComment`.                                             |
| [`scripts/createProject.ts`](scripts/createProject.ts)                 | `createProject` (Create Project)                  | `linear`    | Create a Linear project in one or more teams, with an optional description, lead, and start/target dates.                                              |
| [`scripts/updateProject.ts`](scripts/updateProject.ts)                 | `updateProject` (Update Project)                  | `linear`    | Update a Linear project's name, description, state, lead, or target date.                                                                              |
| [`scripts/getProject.ts`](scripts/getProject.ts)                       | `getProject` (Get Project)                        | `linear`    | Fetch a single Linear project by its id, with its name, description, url, and state.                                                                   |
| [`scripts/listProjects.ts`](scripts/listProjects.ts)                   | `listProjects` (List Projects)                    | `linear`    | List Linear projects, optionally scoped to a team. Returns a page of projects plus a cursor. Resolve a project name to its id.                         |
| [`scripts/createProjectUpdate.ts`](scripts/createProjectUpdate.ts)     | `createProjectUpdate` (Create Project Update)     | `linear`    | Post a status update to a Linear project, with an optional health signal (onTrack, atRisk, offTrack).                                                  |
| [`scripts/listTeams.ts`](scripts/listTeams.ts)                         | `listTeams` (List Teams)                          | `linear`    | List the workspace's teams. Resolve a team name or key to its id for `createIssue` and filters. Returns a page plus a cursor.                          |
| [`scripts/listWorkflowStates.ts`](scripts/listWorkflowStates.ts)       | `listWorkflowStates` (List Workflow States)       | `linear`    | List a team's workflow states (statuses). Resolve a status name to its id for `stateId` inputs. Returns a page plus a cursor.                          |
| [`scripts/listLabels.ts`](scripts/listLabels.ts)                       | `listLabels` (List Labels)                        | `linear`    | List issue labels, optionally scoped to a team. Resolve a label name to its id for `labelId` inputs. Returns a page plus a cursor.                     |
| [`scripts/listUsers.ts`](scripts/listUsers.ts)                         | `listUsers` (List Users)                          | `linear`    | List workspace users. Resolve a name or email to a user id for `assigneeId`. Use `getViewer` for your own id. Returns a page plus a cursor.            |
| [`scripts/listProjectMilestones.ts`](scripts/listProjectMilestones.ts) | `listProjectMilestones` (List Project Milestones) | `linear`    | List a project's milestones. Resolve a milestone name to its id for `projectMilestoneId` inputs. Returns a page plus a cursor.                         |
| [`scripts/listCycles.ts`](scripts/listCycles.ts)                       | `listCycles` (List Cycles)                        | `linear`    | List a team's cycles (sprints). The current cycle is the one whose startsAt/endsAt spans now. Resolve a cycle to its id. Returns a page plus a cursor. |
| [`scripts/getViewer.ts`](scripts/getViewer.ts)                         | `getViewer` (Get Viewer)                          | `linear`    | Return the authenticated user (the "me" identity) — id, name, email. Use the id to assign issues to yourself or filter your own issues.                |

<!-- END:skill-scripts-table -->

<!-- BEGIN:disambiguation-and-refusals? -->

## Disambiguation & refusals

This connector resolves names to ids, then writes. Two situations trip up an action-biased agent — handle both before you write.

**Before writing to a record you looked up by name** — the id inputs on the write tools (`assigneeId`, `teamId`, `projectId`, `leadId`, `stateId`, `labelId`, `cycleId`, `projectMilestoneId`) are UUIDs you get from a resolver tool (`listUsers`, `listTeams`, `listProjects`, `listWorkflowStates`, `listLabels`, `listCycles`, `listProjectMilestones`). The names most likely to collide are **users** (two people with the same display name — resolve with `listUsers`) and **projects / teams** (a workspace can have similarly-named ones — resolve with `listProjects` / `listTeams`). Count the **exact case-insensitive name matches** in the resolver's page:

- **Exactly one match** — act on it. Don't over-ask; a single unambiguous match is the answer.
- **Two or more that tie** — stop. List the tied candidates with a distinguishing field (a user's `email`, a project's `state` / `url`, a team's `key`) and ask the user which one they mean. Don't pick arbitrarily and don't write against all of them.

**Before fulfilling a request, check that a script actually does it.** This catalog deliberately does not:

- **Hard-delete an issue.** There is no permanent delete — use `archiveIssue`, which is reversible (recoverable from the archive). Don't substitute another tool and call the issue deleted.
- **Manage the customer-requests surface** (create or find customers and their needs). It is not in this version. There is no tool for it; don't approximate it with an issue or a project.
- **Set up triggers or event subscriptions.** This connector is non-trigger by design; Linear's webhook surface is not exposed.

If asked for any of these, tell the user it's unsupported and stop — don't reach for an unrelated tool to approximate it and never report success for an action you didn't perform.
<!-- END:disambiguation-and-refusals -->

## Auth

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it — a UUID-shaped bare value always claims `zapier:`. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Checking what's already configured first? Don't dump environment values to do it — `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if one is set. Check names only (`env | cut -d= -f1 | grep -i <name>`) or test a known name directly (`[ -n "$VAR_NAME" ]`).

<!-- BEGIN:skill-auth-notes? operational behavior that differs by WHICH resolver is used — a safety gate only one path enforces, scopes/permissions that differ between resolvers, a billing/plan difference tied to the auth path, or a feature only available (or unavailable) on one resolver. Not for describing how to obtain or pass a credential — that's references/use-without-zapier.md's job. Leave this region empty (unfilled) if every resolver behaves identically. -->
<!-- END:skill-auth-notes -->

No connection yet? Pick one — and follow the reference's own flow to obtain it; never just ask the user for a connection id or token as if they already have one memorized:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; see the reference you loaded above for how to inspect a script's exact schema in your shape).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, opt out of output validation (the exact syntax differs by shape — see the reference you loaded above). Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` (again, exact syntax per shape). The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` — or your shape's equivalent — to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

<!-- BEGIN:skill-references-table -->

## References

Load the matching reference file before working in that area:

| Reference                                                              | Covers                                                                                                                                                                                                                                                                                  | Load it when                                                                                                                                                              |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/linear-api-gotchas.md`](references/linear-api-gotchas.md) | Auth header form (bare key vs `Bearer`), the HTTP-200-with-`errors` envelope, the 400 `RATELIMITED` rate-limit case, Relay cursor pagination, UUID vs `ENG-118` identifiers, the priority `0`–`4` scale, workflow-state `type` categories, link-based attachments, reversible archiving | Any call that authenticates, handles an error, paginates, resolves an id, or sets priority/state/labels/attachments — i.e. before writing or debugging any Linear request |
| [`references/linear-formatting.md`](references/linear-formatting.md)   | Linear's Markdown surface: standard Markdown (headings, lists, code blocks, checklists), and the two Linear-specific quirks — `@`-mentions composed from a resource's plain URL (not `@name`) over the API, and `+++ … +++` collapsible sections                                        | Before composing or editing an issue description, comment body, project update body, or project description — anything that fills a Markdown `body`/`description` field   |

<!-- END:skill-references-table -->
