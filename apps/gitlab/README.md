# @zapier/gitlab-connector

<!-- BEGIN:readme-intro -->

Agent-callable tools for GitLab, the DevOps platform for source code, merge requests, and CI/CD. The connector wraps the [GitLab REST API v4](https://docs.gitlab.com/api/rest/) (plus GitLab's GraphQL Work Items surface for epics and other work items), giving an agent one toolset for the merge-request review loop (read MRs, diffs, commits, and discussions; comment inline; approve; merge), repository authoring (branch, atomic multi-file commit, read files and tree, compare refs), issue and work-item management, CI/CD (trigger, retry, cancel pipelines; read job logs; play manual jobs), and search across projects, code, and records. It targets `gitlab.com` by default and works against self-managed or GitLab Dedicated hosts. Auth is one connection string: a long-lived GitLab access token or a Zapier-managed connection (which also supports OAuth).

<!-- legal:disclaimer -->

_Independent, unofficial connector for Gitlab. Not affiliated with, endorsed by, or sponsored by Gitlab. "Gitlab" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:readme-intro -->

## When to use this

<!-- BEGIN:readme-when-to-use -->

- You want an agent to run the merge-request review loop end to end: read an MR and its diffs, commits, notes, and threaded discussions, leave inline or top-level comments, approve, and merge.
- You want an agent to author repository changes — create branches, commit many files in a single atomic commit, read files and the tree, and compare refs — and to manage issues, epics/work items, and CI/CD pipelines.
- You want an agent to search GitLab (globally, per project, or per group) and resolve project, user, label, and milestone ids before writing.

<!-- END:readme-when-to-use -->

## When NOT to use this

<!-- BEGIN:readme-when-not-to-use -->

- Project, group, or instance administration — creating or deleting projects, managing members, protected branches, runners, or settings. This connector does not cover admin surfaces.
- Triggers or event subscriptions (webhooks, polling). This connector is request/response only; use a workflow platform for event-driven flows.
- Deprecated REST epics endpoints. Manage epics through the Work Items tools (GraphQL) instead.

<!-- END:readme-when-not-to-use -->

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/gitlab-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/gitlab-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill gitlab
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection` — a _selector_, not the secret. The `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver. See [Auth](#auth) below for the with/without-Zapier tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "gitlab": {
      "command": "npx",
      "args": ["@zapier/gitlab-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

<!-- BEGIN:readme-scripts-table -->

| Script          | Description                                                                                |
| --------------- | ------------------------------------------------------------------------------------------ |
| `listProjects`  | List or search projects the token can see (resolves `projectId`).                          |
| `getProject`    | Get one project's metadata by id or path (incl. `default_branch`).                         |
| `search`        | Search globally across projects, issues, MRs, milestones, users, code, or commits.         |
| `searchProject` | Search within one project across issues, MRs, milestones, users, code, or commits.         |
| `searchGroup`   | Search within one group across projects, issues, MRs, milestones, users, code, or commits. |

**Issues**

| Script            | Description                                                                    |
| ----------------- | ------------------------------------------------------------------------------ |
| `listIssues`      | List issues in a project, filterable by state, labels, assignee, or milestone. |
| `getIssue`        | Get one issue including its full markdown description.                         |
| `createIssue`     | Open a new issue with a markdown description.                                  |
| `updateIssue`     | Update an issue's fields, or close/reopen it.                                  |
| `addIssueComment` | Add a comment (note) to an issue.                                              |

**Merge requests**

| Script                        | Description                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `listMergeRequests`           | List MRs assigned to or created by the token identity across all projects (global). |
| `listProjectMergeRequests`    | List merge requests in one project.                                                 |
| `listGroupMergeRequests`      | List merge requests across all projects in one group.                               |
| `getMergeRequest`             | Get one merge request's full detail (the entry point to the review loop).           |
| `createMergeRequest`          | Open a merge request from a source branch into a target branch.                     |
| `updateMergeRequest`          | Update an MR's fields, or close/reopen it.                                          |
| `mergeMergeRequest`           | Merge a merge request (optionally squash, or guard with a head `sha`).              |
| `approveMergeRequest`         | Approve (or revoke approval on) a merge request.                                    |
| `getMergeRequestDiffs`        | Get the paginated file diffs for a merge request.                                   |
| `listMergeRequestCommits`     | List the commits on a merge request.                                                |
| `listMergeRequestNotes`       | List the comments (notes) on a merge request.                                       |
| `addMergeRequestComment`      | Add a top-level comment (note) to a merge request.                                  |
| `addMergeRequestDiffComment`  | Add a review comment pinned to a specific line of an MR diff.                       |
| `listMergeRequestDiscussions` | List discussion threads on an MR, incl. diff notes and resolved/resolvable status.  |

**Repository**

| Script               | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| `listBranches`       | List (or search) a project's branches.                                      |
| `createBranch`       | Create a branch from an existing ref (ref is required — no silent default). |
| `commitFiles`        | Create, update, delete, or move multiple files in a single atomic commit.   |
| `listCommits`        | List commits on a branch or across the repository.                          |
| `getFile`            | Read a file's contents at a ref.                                            |
| `listRepositoryTree` | List files and directories in a repository path.                            |
| `compareRefs`        | Compare two refs and return the diff between them.                          |

**CI/CD**

| Script             | Description                                                                |
| ------------------ | -------------------------------------------------------------------------- |
| `triggerPipeline`  | Run a new pipeline on a ref, with optional CI/CD variables.                |
| `listPipelines`    | List pipelines for a project, filterable by ref or status.                 |
| `getPipeline`      | Get one pipeline's status and metadata.                                    |
| `listPipelineJobs` | List the jobs in a pipeline.                                               |
| `getJobLog`        | Get the log (trace) output of a CI job.                                    |
| `retryPipeline`    | Retry the failed and canceled jobs in a pipeline, keeping the passed ones. |
| `cancelPipeline`   | Cancel a running pipeline, stopping its in-progress and pending jobs.      |
| `playJob`          | Start a manual job waiting on a manual action (a play button).             |

**Work items** (GraphQL)

| Script           | Description                                                             |
| ---------------- | ----------------------------------------------------------------------- |
| `listWorkItems`  | List work items in a project or group, filterable by type and state.    |
| `getWorkItem`    | Get one work item's full detail including its description and type.     |
| `createWorkItem` | Create a work item (epic, task, objective, etc.) in a project or group. |
| `updateWorkItem` | Update a work item's fields, or close/reopen it.                        |

**Metadata & resolvers**

| Script           | Description                                                             |
| ---------------- | ----------------------------------------------------------------------- |
| `listLabels`     | List a project's labels (resolves valid label names).                   |
| `listMilestones` | List a project's milestones (resolves `milestone_id`).                  |
| `getCurrentUser` | Get the identity of the authenticated token (also the connection test). |
| `findUsers`      | Find users by username or search term (resolves assignee/reviewer ids). |

<!-- END:readme-scripts-table -->

Run `npx @zapier/gitlab-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

<!-- BEGIN:readme-usage-example -->

```ts
import { getMergeRequest } from "@zapier/gitlab-connector";

const { data, meta } = await getMergeRequest(
  { projectId: "my-group/my-project", mergeRequestIid: 42 },
  { connection: "env:GITLAB_TOKEN" },
);
// data is the MR detail; meta.outputDataValidation reports any dropped fields.
```

<!-- END:readme-usage-example -->

## Auth

Already have a connection value? Pass it as shown above — `--connection` for the CLI/MCP shapes, `{ connection }` for imported functions. No connection yet? Pick one:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/gitlab)

<!-- BEGIN:readme-links-extra -->

- [GitLab REST API docs](https://docs.gitlab.com/api/rest/)

<!-- END:readme-links-extra -->

<!-- BEGIN:readme-footer? -->
<!-- legal:footer -->

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Gitlab's API, services, data, schemas, documentation, or other materials, which remain the property of Gitlab. Your use of Gitlab's API is governed by your own agreement with Gitlab.

**Trademarks and affiliation.** Gitlab and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Gitlab.

**Your responsibility.** This connector calls Gitlab's API using credentials you supply. You are responsible for holding a valid Gitlab account, for complying with Gitlab's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Gitlab product. Zapier is not responsible for changes Gitlab makes to its API or for any consequence of your use of Gitlab's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
<!-- /legal:footer -->
<!-- END:readme-footer -->
