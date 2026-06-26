---
name: trello
description: Agent-callable Trello tools — create and update cards, manage boards, lists, labels, checklists, and search. Use when the user mentions Trello or wants to create cards, move tasks, or manage boards, even if they do not name Trello explicitly.
license: Elastic-2.0
compatibility: Requires Node.js 22.18+; run `npm install` in this directory first.
metadata:
  title: Trello
  source: https://github.com/zapier/connectors/blob/main/apps/trello/SKILL.md
  api-docs: https://developer.atlassian.com/cloud/trello/rest/
  zapier-app-key: TrelloAPI
---

# Trello

_Independent, unofficial connector for Trello. Not affiliated with, endorsed by, or sponsored by Trello. "Trello" is a trademark of its owner, used only to identify the service this connector works with._

Tools for working with Trello against the [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/) (`https://api.trello.com/1`): create and move cards, manage boards and lists, labels and checklists, comments and attachments, member lookups, and search. 44 tools across boards, lists, cards, labels, checklists, members, and search.

## When to use this connector

- An agent needs to **create or update cards** — add tasks, set due dates, assign members, add labels, or archive/reopen cards.
- An agent needs to **organize boards** — create boards and lists, move cards between lists, copy boards, or close (archive) boards.
- An agent needs to **look up Trello resources by name** — find boards, lists, labels, or checklists before writing.
- An agent needs to **search cards** or read board/list/card detail for planning or reporting.

## Step 0 — setup and auth

This connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point; discover any script's inputs and connections by running it with `--help`:

```bash
node cli.js run <tool-name> --help
```

`cli.js` self-checks readiness before running. If dependencies aren't installed it prints a line starting `CONNECTOR_SETUP: NEEDS_ACTION` followed by `CONNECTOR_SETUP_RECOMMENDATION:` with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run the `--help` command.

The `--help` output lists the connection flag(s) the script reads and every resolver each accepts — value shape and auto-claim behavior. Run scripts against this local path — never `npx` (a sandbox that blocked the dep install may also block registry fetches).

## Auth

Trello uses **OAuth 1.0a** — every request carries an `Authorization: OAuth oauth_consumer_key="…", oauth_token="…"` header built from an API key plus access token. One connection slot (`trello`) holds both values. Pass auth as one connection string with `--connection [<resolver>:]<value>` (CLI / MCP) or `{ connection: "[<resolver>:]<value>" }` (imported). The value is a _selector_, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Two resolvers, Zapier-first:

- **`zapier:<connection-id>`** _(recommended)_ — route through a Zapier Trello connection. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>, ~1 minute). The user authorizes Trello once via Zapier's OAuth flow; token refresh is handled for you. A bare UUID auto-claims this resolver. Find the ID with the Zapier SDK CLI: `npx @zapier/zapier-sdk-cli list-connections TrelloAPI` (run `login` first if unauthenticated; add `--json` for machine output).
- **`env:TRELLO`** _(fallback)_ — read credentials from **`TRELLO_API_KEY`** and **`TRELLO_TOKEN`** environment variables (both required; the prefix `TRELLO` maps to those two keys). Export both before calling — the secrets stay in `env`, never on argv.

If no connection is passed the script fails with an actionable error telling you to `Pass --connection [<resolver>:]<value>` and lists the resolvers in match order.

## Scripts

One file per tool in [`scripts/`](scripts/); each tool's `inputSchema` / `outputSchema` (Zod) in the script file is the source of truth for its contract. Shared helpers live in [`lib/trello.ts`](lib/trello.ts). All tools use the single connection `trello`.

**Boards:** `createBoard`, `copyBoard`, `closeBoard`, `getBoard`, `listBoards`, `findBoard`, `listBoardMembers`, `addMemberToBoard`.
**Lists:** `createList`, `getList`, `listLists`, `findList`.
**Cards:** `createCard`, `updateCard`, `archiveCard`, `moveCard`, `getCard`, `listCards`, `searchCards`, `createComment`, `getAction`, `listCardAttachments`, `addCardAttachment`.
**Labels:** `createLabel`, `getLabel`, `listLabels`, `findLabel`, `addCardLabel`, `removeCardLabel`.
**Checklists:** `createChecklist`, `getChecklist`, `deleteChecklist`, `findChecklist`, `addChecklistItem`, `getChecklistItem`, `findChecklistItem`, `completeChecklistItem`.
**Members & workspaces:** `getCurrentMember`, `getMember`, `findOrganizationMember`, `getOrganization`, `listOrganizations`, `addCardMember`, `listCustomFields`.

**Resolve ids before writes.** Trello ids are 24-character hex strings. When the user names a board, list, or label, call the matching `find*` or `list*` tool first and pass the returned id into create/update/move tools — never guess ids.

**Always learn a script's input contract before calling it — never guess field names, casing, or types.** Run `--help` on either entrypoint — `./scripts/<script>.ts --help` or `npx @zapier/trello-connector run <script> --help` — which renders `inputSchema` as JSON Schema and lists the connection flag(s) and available resolvers. Guessing the payload just produces a `ZodError` and wastes a round-trip.

## Output format

Every script returns a `{ data, meta }` envelope (same shape across the CLI's JSON output, the imported SDK return value, and the MCP tool's `structuredContent`):

- **`data`** — the script's result (the shape declared by its `outputSchema`).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths (fields the API returned that the `outputSchema` doesn't declare) were stripped from `data`. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked API output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, set the single token `skipOutputDataValidation` — CLI: append `--skipOutputDataValidation`; MCP: pass `meta: { skipOutputDataValidation: true }` as a tool argument; SDK: pass `{ skipOutputDataValidation: true }` in the run options. Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` — CLI: append `--filterOutputData '<jq>'`; MCP: pass `meta: { filterOutputData: "<jq>" }` as a tool argument. The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (see this script's output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema. The imported SDK has no `filterOutputData` option — reshape the returned `data` in code instead.

## Disambiguation & refusals

**Disambiguation before a write.** Before writing to a board, list, card, label, or checklist you looked up by name (e.g. create a card on a list found via `findList`, or add a label found via `findLabel`), count the **exact case-insensitive name matches**:

- **Exactly one match** — act on it. Don't over-ask; a single unambiguous match is the answer.
- **Two or more that tie** — stop. List the tied candidates with a distinguishing field (id + name + board/list context) and ask the user which one they mean. Don't pick arbitrarily and don't write to all of them.

**Unsupported operations — say so and stop; don't fake it with another tool.** This catalog deliberately does not:

- **Manage webhooks, automations, or Power-Ups.** There are no trigger or Butler-rule tools.
- **Upload local binary files.** `addCardAttachment` accepts a URL or remote file URL only — not a local path or base64 payload.
- **Permanently delete boards or cards.** `closeBoard` and `archiveCard` archive (soft-close) resources; there is no hard-delete tool.
- **Manage workspace billing, admin settings, or enterprise policies.**

If asked for any of these, tell the user it's unsupported and stop — don't reach for an unrelated tool to approximate it.

## Using this skill

The three invocation paths below all assume `npm install` has completed.

### 1. Execute scripts directly

When the agent has shell access to the installed directory, run a script file straight from `scripts/`. Each script is `chmod +x` with a Node-targeted shebang. **Run `--help` first** to read the input contract and confirm an auth option is `[READY — use this]`:

```bash
# Inspect the contract + resolvers first
./scripts/createCard.ts --help

# Then invoke (Zapier connection — recommended)
./scripts/createCard.ts '{"idList":"604a45a4087d070014a2b5f5","name":"Review PR"}' --connection zapier:conn_xxx

# Direct OAuth 1.0a credentials (both env vars required)
TRELLO_API_KEY=xxx TRELLO_TOKEN=yyy ./scripts/listBoards.ts '{}' --connection env:TRELLO
```

Prerequisites: Node.js 22.18+ on `PATH`, plus `npm install` once in this directory. Pin the runtime explicitly with `node scripts/<name>.ts …` when needed — all forms run the same script body.

### 2. Use the package's CLI

```bash
TRELLO_API_KEY=xxx TRELLO_TOKEN=yyy npx @zapier/trello-connector run listBoards '{}' --connection env:TRELLO
npx @zapier/trello-connector --help                      # all scripts
npx @zapier/trello-connector run createCard --help       # per-script schema + resolvers
```

Same scripts, different entry point. Some harnesses block `npx` — fall back to (1).

### 3. Use as a recipe

When no shipped script matches, read this `SKILL.md`, the [`references/`](references/) files, and the `scripts/` files as a recipe to generate custom code. Each script is one `export default defineTool({...})` referencing the connection key `"trello"`; imitate that shape (Zod input/output schemas, `(input, ctx) => …` run body, error handling from [`lib/trello.ts`](lib/trello.ts)). If you persist generated code, add a comment pointing back to this skill's source.

## API quirks worth knowing

See [references/trello-api-gotchas.md](references/trello-api-gotchas.md).

## Reference files

| File                                                                 | When to load                                                                                                          |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [references/trello-api-gotchas.md](references/trello-api-gotchas.md) | Before search-heavy flows, rate-limit-sensitive loops, or any write that needs id resolution (lists, boards, labels). |

## Eval cases

See [`evals/evals.json`](evals/evals.json) — 16 intent-anchored scenarios (arrange-act, act-only, disambiguation, graceful refusals).
