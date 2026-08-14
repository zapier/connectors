---
name: gitlab
description: Agent-callable GitLab tools — manage issues and merge requests, review diffs, commit files, run pipelines, and search. Use when the user mentions GitLab or wants to review or merge an MR, commit code, run CI, or manage issues — even if they don't name GitLab explicitly.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/gitlab/SKILL.md
  title: Gitlab
  api-docs: https://docs.gitlab.com/api/rest/
  zapier-app-key: GitLabCLIAPI
---

# Gitlab

<!-- BEGIN:skill-intro -->

Agent-callable tools for GitLab, the DevOps platform for source code, merge requests, and CI/CD. The connector wraps the [GitLab REST API v4](https://docs.gitlab.com/api/rest/) (with one GraphQL island — the Work Items surface — reached through `POST /api/graphql`), giving an agent the ability to read and drive projects, issues, merge requests, repository contents, and pipelines. It is centered on the merge-request review loop and repository authoring: read an MR and its diffs and discussions, comment or approve, commit file changes atomically, and run or inspect CI. It targets GitLab SaaS (`gitlab.com`) by default; the host is configurable for self-managed and GitLab Dedicated instances.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Gitlab. Not affiliated with, endorsed by, or sponsored by Gitlab. "Gitlab" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:skill-intro -->

## When to use this

<!-- BEGIN:skill-use-cases -->

- An agent needs to drive the merge-request review loop: list and read MRs, fetch their diffs, commits, notes, and threaded discussions, comment inline on a diff line, approve or unapprove, and merge.
- An agent needs to author repository changes: create a branch, commit many files in one atomic commit, read files and the repository tree, list commits, and compare two refs.
- An agent needs to manage issues (REST): create, update, comment on, and close/reopen them — or manage work items like epics, tasks, and objectives (GraphQL): create, update, and close/reopen.
- An agent needs to run and inspect CI/CD: trigger, list, get, retry, or cancel pipelines; list jobs, read a job log, and play a manual job.
- An agent needs to search — globally, within a project, or within a group — across issues, merge requests, code, commits, users, and more, and resolve project, user, label, and milestone ids before writing.

<!-- END:skill-use-cases -->

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill gitlab` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

Want the actual repo source instead — to browse `references/`, run this connector's tests, or hack on it? See [`README.md`](README.md#cloning-the-source) for a scoped `git clone`.

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                 | Load                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__gitlab__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                           | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                  | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Gitlab API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

<!-- BEGIN:skill-connections-note? -->

All 47 scripts use the single connection `gitlab`. Project-scoped tools take a `projectId` (numeric id or URL-encoded `group/project` path); issues and MRs are addressed by their project-scoped `iid`, not the global id. The script's `inputSchema` / `outputSchema` (Zod) inside the file is the source of truth for its contract.

**Projects & search**
<!-- END:skill-connections-note -->

<!-- BEGIN:skill-scripts-table -->

| Script                                                 | Script name     | Connections | Description                                                                                |
| ------------------------------------------------------ | --------------- | ----------- | ------------------------------------------------------------------------------------------ |
| [`scripts/listProjects.ts`](scripts/listProjects.ts)   | `listProjects`  | `gitlab`    | List or search projects the token can see (resolves `projectId`).                          |
| [`scripts/getProject.ts`](scripts/getProject.ts)       | `getProject`    | `gitlab`    | Get one project's metadata by id or path (incl. `default_branch`).                         |
| [`scripts/search.ts`](scripts/search.ts)               | `search`        | `gitlab`    | Search globally across projects, issues, MRs, milestones, users, code, or commits.         |
| [`scripts/searchProject.ts`](scripts/searchProject.ts) | `searchProject` | `gitlab`    | Search within one project across issues, MRs, milestones, users, code, or commits.         |
| [`scripts/searchGroup.ts`](scripts/searchGroup.ts)     | `searchGroup`   | `gitlab`    | Search within one group across projects, issues, MRs, milestones, users, code, or commits. |

**Issues**

| Script                                                     | Script name       | Connections | Description                                                                    |
| ---------------------------------------------------------- | ----------------- | ----------- | ------------------------------------------------------------------------------ |
| [`scripts/listIssues.ts`](scripts/listIssues.ts)           | `listIssues`      | `gitlab`    | List issues in a project, filterable by state, labels, assignee, or milestone. |
| [`scripts/getIssue.ts`](scripts/getIssue.ts)               | `getIssue`        | `gitlab`    | Get one issue including its full markdown description.                         |
| [`scripts/createIssue.ts`](scripts/createIssue.ts)         | `createIssue`     | `gitlab`    | Open a new issue with a markdown description.                                  |
| [`scripts/updateIssue.ts`](scripts/updateIssue.ts)         | `updateIssue`     | `gitlab`    | Update an issue's fields, or close/reopen it.                                  |
| [`scripts/addIssueComment.ts`](scripts/addIssueComment.ts) | `addIssueComment` | `gitlab`    | Add a comment (note) to an issue.                                              |

**Merge requests**

| Script                                                                             | Script name                   | Connections | Description                                                                         |
| ---------------------------------------------------------------------------------- | ----------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| [`scripts/listMergeRequests.ts`](scripts/listMergeRequests.ts)                     | `listMergeRequests`           | `gitlab`    | List MRs assigned to or created by the token identity across all projects (global). |
| [`scripts/listProjectMergeRequests.ts`](scripts/listProjectMergeRequests.ts)       | `listProjectMergeRequests`    | `gitlab`    | List merge requests in one project.                                                 |
| [`scripts/listGroupMergeRequests.ts`](scripts/listGroupMergeRequests.ts)           | `listGroupMergeRequests`      | `gitlab`    | List merge requests across all projects in one group.                               |
| [`scripts/getMergeRequest.ts`](scripts/getMergeRequest.ts)                         | `getMergeRequest`             | `gitlab`    | Get one merge request's full detail (the entry point to the review loop).           |
| [`scripts/createMergeRequest.ts`](scripts/createMergeRequest.ts)                   | `createMergeRequest`          | `gitlab`    | Open a merge request from a source branch into a target branch.                     |
| [`scripts/updateMergeRequest.ts`](scripts/updateMergeRequest.ts)                   | `updateMergeRequest`          | `gitlab`    | Update an MR's fields, or close/reopen it.                                          |
| [`scripts/mergeMergeRequest.ts`](scripts/mergeMergeRequest.ts)                     | `mergeMergeRequest`           | `gitlab`    | Merge a merge request (optionally squash, or guard with a head `sha`).              |
| [`scripts/approveMergeRequest.ts`](scripts/approveMergeRequest.ts)                 | `approveMergeRequest`         | `gitlab`    | Approve (or revoke approval on) a merge request.                                    |
| [`scripts/getMergeRequestDiffs.ts`](scripts/getMergeRequestDiffs.ts)               | `getMergeRequestDiffs`        | `gitlab`    | Get the paginated file diffs for a merge request.                                   |
| [`scripts/listMergeRequestCommits.ts`](scripts/listMergeRequestCommits.ts)         | `listMergeRequestCommits`     | `gitlab`    | List the commits on a merge request.                                                |
| [`scripts/listMergeRequestNotes.ts`](scripts/listMergeRequestNotes.ts)             | `listMergeRequestNotes`       | `gitlab`    | List the comments (notes) on a merge request.                                       |
| [`scripts/addMergeRequestComment.ts`](scripts/addMergeRequestComment.ts)           | `addMergeRequestComment`      | `gitlab`    | Add a top-level comment (note) to a merge request.                                  |
| [`scripts/addMergeRequestDiffComment.ts`](scripts/addMergeRequestDiffComment.ts)   | `addMergeRequestDiffComment`  | `gitlab`    | Add a review comment pinned to a specific line of an MR diff.                       |
| [`scripts/listMergeRequestDiscussions.ts`](scripts/listMergeRequestDiscussions.ts) | `listMergeRequestDiscussions` | `gitlab`    | List discussion threads on an MR, incl. diff notes and resolved/resolvable status.  |

**Repository**

| Script                                                           | Script name          | Connections | Description                                                                 |
| ---------------------------------------------------------------- | -------------------- | ----------- | --------------------------------------------------------------------------- |
| [`scripts/listBranches.ts`](scripts/listBranches.ts)             | `listBranches`       | `gitlab`    | List (or search) a project's branches.                                      |
| [`scripts/createBranch.ts`](scripts/createBranch.ts)             | `createBranch`       | `gitlab`    | Create a branch from an existing ref (ref is required — no silent default). |
| [`scripts/commitFiles.ts`](scripts/commitFiles.ts)               | `commitFiles`        | `gitlab`    | Create, update, delete, or move multiple files in a single atomic commit.   |
| [`scripts/listCommits.ts`](scripts/listCommits.ts)               | `listCommits`        | `gitlab`    | List commits on a branch or across the repository.                          |
| [`scripts/getFile.ts`](scripts/getFile.ts)                       | `getFile`            | `gitlab`    | Read a file's contents at a ref.                                            |
| [`scripts/listRepositoryTree.ts`](scripts/listRepositoryTree.ts) | `listRepositoryTree` | `gitlab`    | List files and directories in a repository path.                            |
| [`scripts/compareRefs.ts`](scripts/compareRefs.ts)               | `compareRefs`        | `gitlab`    | Compare two refs and return the diff between them.                          |

**CI/CD**

| Script                                                       | Script name        | Connections | Description                                                                |
| ------------------------------------------------------------ | ------------------ | ----------- | -------------------------------------------------------------------------- |
| [`scripts/triggerPipeline.ts`](scripts/triggerPipeline.ts)   | `triggerPipeline`  | `gitlab`    | Run a new pipeline on a ref, with optional CI/CD variables.                |
| [`scripts/listPipelines.ts`](scripts/listPipelines.ts)       | `listPipelines`    | `gitlab`    | List pipelines for a project, filterable by ref or status.                 |
| [`scripts/getPipeline.ts`](scripts/getPipeline.ts)           | `getPipeline`      | `gitlab`    | Get one pipeline's status and metadata.                                    |
| [`scripts/listPipelineJobs.ts`](scripts/listPipelineJobs.ts) | `listPipelineJobs` | `gitlab`    | List the jobs in a pipeline.                                               |
| [`scripts/getJobLog.ts`](scripts/getJobLog.ts)               | `getJobLog`        | `gitlab`    | Get the log (trace) output of a CI job.                                    |
| [`scripts/retryPipeline.ts`](scripts/retryPipeline.ts)       | `retryPipeline`    | `gitlab`    | Retry the failed and canceled jobs in a pipeline, keeping the passed ones. |
| [`scripts/cancelPipeline.ts`](scripts/cancelPipeline.ts)     | `cancelPipeline`   | `gitlab`    | Cancel a running pipeline, stopping its in-progress and pending jobs.      |
| [`scripts/playJob.ts`](scripts/playJob.ts)                   | `playJob`          | `gitlab`    | Start a manual job waiting on a manual action (a play button).             |

**Work items** (GraphQL)

| Script                                                   | Script name      | Connections | Description                                                             |
| -------------------------------------------------------- | ---------------- | ----------- | ----------------------------------------------------------------------- |
| [`scripts/listWorkItems.ts`](scripts/listWorkItems.ts)   | `listWorkItems`  | `gitlab`    | List work items in a project or group, filterable by type and state.    |
| [`scripts/getWorkItem.ts`](scripts/getWorkItem.ts)       | `getWorkItem`    | `gitlab`    | Get one work item's full detail including its description and type.     |
| [`scripts/createWorkItem.ts`](scripts/createWorkItem.ts) | `createWorkItem` | `gitlab`    | Create a work item (epic, task, objective, etc.) in a project or group. |
| [`scripts/updateWorkItem.ts`](scripts/updateWorkItem.ts) | `updateWorkItem` | `gitlab`    | Update a work item's fields, or close/reopen it.                        |

**Metadata & resolvers**

| Script                                                   | Script name      | Connections | Description                                                             |
| -------------------------------------------------------- | ---------------- | ----------- | ----------------------------------------------------------------------- |
| [`scripts/listLabels.ts`](scripts/listLabels.ts)         | `listLabels`     | `gitlab`    | List a project's labels (resolves valid label names).                   |
| [`scripts/listMilestones.ts`](scripts/listMilestones.ts) | `listMilestones` | `gitlab`    | List a project's milestones (resolves `milestone_id`).                  |
| [`scripts/getCurrentUser.ts`](scripts/getCurrentUser.ts) | `getCurrentUser` | `gitlab`    | Get the identity of the authenticated token (also the connection test). |
| [`scripts/findUsers.ts`](scripts/findUsers.ts)           | `findUsers`      | `gitlab`    | Find users by username or search term (resolves assignee/reviewer ids). |

<!-- END:skill-scripts-table -->

<!-- BEGIN:disambiguation-and-refusals? -->

## Disambiguation & refusals

This connector resolves names to ids, then writes. Two situations trip up an action-biased agent — handle both before you write.

**Before writing to a record you looked up by name** — count how many returned records match the name the user gave _exactly_ (case-insensitive). This applies to projects looked up by path/name via `listProjects`, users looked up by username via `findUsers`, and labels or milestones via `listLabels` / `listMilestones`:

- **One exact match** (even among other fuzzy hits) → use it. Don't ask for confirmation you don't need.
- **No exact match but one clear fuzzy hit** → use it.
- **Two or more that tie** (two projects both pathed `.../api`, two users both named "Jordan Lee", two labels both "backend") → stop. List them with a distinguishing field (id + `path_with_namespace` / username / description) and ask which one. Never pick one yourself and write against it.

**Before fulfilling a request, check that a script actually does it:**

- A script does it → use it.
- No script does it → say plainly it's unsupported and stop. There are no tools for project, group, or instance administration (creating or deleting a project, managing members, protected branches, runners, webhooks, or pipeline triggers) — these are out of scope. Work items (epics/tasks/objectives) require a Premium/Ultimate project — if a work-item call returns a tier/availability error, say so plainly and stop; don't fake success. Don't substitute a different script and call it done, and never report success for an action you didn't perform.

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

| Reference                                                              | Covers                                                                                                                                                                                                                                                                                                                                                                    | Load it when                                                                                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/gitlab-api-gotchas.md`](references/gitlab-api-gotchas.md) | Vendor behaviors that break a naive caller: `PRIVATE-TOKEN` vs OAuth Bearer auth and `api`/`read_api` scopes, numeric-id-vs-encoded-path and `iid`-vs-global-id, the JSON error shape and status codes, offset vs keyset pagination, gitlab.com rate limits, the singular `POST .../pipeline`, merge 405-when-not-mergeable and the `sha` guard, GraphQL-only work items. | Before any write, or when a call returns a non-2xx status, a 405 on merge, an empty/errored pipeline or work-item call, or an unexpected pagination result. |
| [`references/gitlab-formatting.md`](references/gitlab-formatting.md)   | GitLab Flavored Markdown: blank-line paragraph breaks, `#`/`!`/`@` references, task lists, tables, fenced code highlighting.                                                                                                                                                                                                                                              | When composing a GitLab issue or merge-request description, a work-item body, or a note/diff comment.                                                       |

<!-- END:skill-references-table -->
