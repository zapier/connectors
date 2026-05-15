---
name: notion
description: Search Notion workspaces and create rows in Notion databases. Best practices for working with the Notion REST API — block-based content model, typed property schemas, parent shapes, pagination.
license: MIT
metadata:
  zapier-app-key: NotionCLIAPI
  app-patterns:
    - "^App212303CLIAPI"
    - "^NotionCLIAPI"
    - "^NotionAPI"
---

# Notion

Tools for searching a Notion workspace and creating new rows (pages) inside a Notion database, against the [Notion REST API](https://developers.notion.com/reference/intro) (`https://api.notion.com/v1/`).

## When to use this skill

- An agent needs to find existing Notion pages or databases by name / content.
- An agent needs to add a row to a Notion database the user has already chosen.

For broader Notion operations (page-block manipulation, comment threads, user / workspace admin), follow the same shape — drop new `scripts/<tool>.ts` files in this skill or create adjacent skills.

## Scripts

| Script                                                               | Default export       | Tool name              | Connections                 | What it does                                                                                                                                                                                 | Has dependent fields?                                                                                             |
| -------------------------------------------------------------------- | -------------------- | ---------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [`scripts/search.ts`](scripts/search.ts)                             | `search`             | `search`               | Single (`default`)          | Search Notion pages and databases by query string. Returns matching items with metadata.                                                                                                     | No                                                                                                                |
| [`scripts/create-database-item.ts`](scripts/create-database-item.ts) | `createDatabaseItem` | `create_database_item` | Single (`default`)          | Add a row (page) to a Notion database. Properties keys + types depend on the database's schema.                                                                                              | **Yes** — `properties` depends on `databaseId`. See `createDatabaseItem.inputDependencies` on the default export. |
| [`scripts/copy-page.ts`](scripts/copy-page.ts)                       | `copyPage`           | `copy_page`            | Multi (`source` + `target`) | Copy a Notion page from one workspace ("source") to another ("target"). Canonical multi-connection example — each slot declares `appKey: "notion"` plus a BYO `apiKey` scheme independently. | No                                                                                                                |

Each script's body is one `export default defineTool({...})` — the [`defineTool` helper](../../packages/zapier-skills/README.md#authoring-shape) from `@zapier/skills` bundles the script's surface into a single `Script` object whose fields consumers reach for by dot-access. (The default export is conventionally named after the script's filename, hence `search` / `createDatabaseItem` / `copyPage`; the snippets below use the generic name `script` for brevity.)

- `script` itself is **callable** — `await script(input)` runs the tool against `process.env` (defaulting `callerConfig` to `{ connection: process.env }` for single-conn; per-slot env-prefix partitioning for multi-conn).
- `script.inputSchema` (Zod) — source of truth for the input contract.
- `script.outputSchema` (Zod) — return shape contract.
- `script.tool` — literal MCP [`Tool`](https://modelcontextprotocol.io/specification/2025-06-18/schema#tool) descriptor, composed by `defineTool`: JSON Schema derivations of the Zod sources, plus `_meta["zapier:statements"]` carrying co-located policy hints and (for `create-database-item`) `_meta["zapier:inputDependencies"]` mirroring the dependency declaration.
- `script.run(context, input)` — prebuilt-context entry. Same `(ctx, input)` signature the author wrote (the run parameter is `ctx`; local variables holding a prebuilt one use the full word). Used by long-running consumers after `script.resolveContext(callerConfig)`.
- `script.resolveContext(callerConfig)` — same auto-discrimination as the callable, but returns the full `Context` (with per-slot fetches resolved at `ctx.connections.<slot>`) for long-running consumers to reuse across many `script.run` calls.
- `script.connections` — the resolved slots map. Each slot exposes the lifted `appKey` (if any), `securitySchemes` (BYO schemes plus the internal `zapier` entry synthesized from `appKey`), and the effective CLI `envPrefix`.
- `script.inputDependencies` (only when relevant) — the per-script dependent-fields graph; mirrored on `script.tool._meta["zapier:inputDependencies"]` for adapters that only see the wire `Tool`.

Importing the script gives you the `Script` object as the default; named imports (`import { tool, run } from "./search.ts"`) no longer exist.

## Auth

The script needs one of two env vars. **Zapier-via-Relay is the recommended default**; direct mode is the fallback for users who don't want a Zapier account. The paths have different account prerequisites, so check which the user has before walking them through setup steps for either.

- **`NOTION_ZAPIER_CONNECTION_ID`** _(recommended)_ — a Zapier Notion connection UUID. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>; no credit card, ~1 minute). The user authorises Notion once via Zapier's OAuth flow at <https://zapier.com/app/connections>; the connection then covers their entire Notion workspace without per-resource sharing. The script only ever sees the UUID; the Notion credential itself stays on Zapier's side, so no third-party secret enters the agent's environment or shell history. Revocation / audit / scoping happens at the Zapier-connection level.

  **Finding the UUID.** The Zapier connections UI doesn't currently expose connection UUIDs (planned change). Use the `zapier-sdk` CLI — single command, no ad-hoc scripting:
  1. Check whether the host already has the CLI: `which zapier-sdk`. If missing, install it once host-wide: `npm i -g @zapier/zapier-sdk-cli`.
  2. Check whether the CLI is already authenticated: `zapier-sdk get-profile`. If not, authenticate once host-wide (not per-app): `zapier-sdk login`.
  3. `zapier-sdk list-connections --search notion` — prints `title (UUID)` per matching connection. The `[app]` positional also accepts an exact app key (`NotionCLIAPI`) for a tighter filter, but `--search` is safer when the exact key isn't known. Add `--json` for machine-readable output. If the user has multiple Notion connections (different workspaces), the agent should list the titles and ask which one to use.
  4. **If the connection is shared with the user** (e.g. an org-wide team connection), the default `list-connections` call hides it. Opt in explicitly with both flags: `zapier-sdk --can-include-shared-connections list-connections --search notion --include-shared`. Don't auto-retry with this on if the first call returns empty — the SDK gates this deliberately; ask the user first.

- **`NOTION_TOKEN`** _(fallback)_ — a Notion integration token from <https://www.notion.so/profile/integrations>. **Prerequisite: only the Notion account the user already has.** The user creates the integration, then shares each page or database with it manually via Notion's UI (Connections menu) before the agent can access that resource. The raw token lives in the environment where the script runs.

If the user mentions they don't have a Zapier account, surface signup as a real option alongside the `NOTION_TOKEN` path rather than silently falling back — the ~1-minute signup is comparable to the per-page-sharing dance the `NOTION_TOKEN` path requires for any workspace with more than a handful of pages.

If neither env var is set the script fails with `Set NOTION_TOKEN or NOTION_ZAPIER_CONNECTION_ID.`

## Running locally

```bash
# Single-conn — Zapier-via-Relay — Zapier Notion connection UUID (recommended)
NOTION_ZAPIER_CONNECTION_ID=conn_xxx echo '{"query":"foo"}' | bun scripts/search.ts

# Single-conn — Direct — Notion integration token (fallback)
NOTION_TOKEN=secret_xxx echo '{"query":"foo"}' | bun scripts/search.ts

# Multi-conn — copy a page between two Zapier-connected workspaces.
# Per-slot env prefixes route credentials to the right slot (no agent context).
SOURCE_NOTION_ZAPIER_CONNECTION_ID=conn_src \
TARGET_NOTION_ZAPIER_CONNECTION_ID=conn_tgt \
echo '{"sourcePageId":"...","targetParentPageId":"..."}' | bun scripts/copy-page.ts
```

Auth recipe for direct mode: Bearer token in the `Authorization` header. The Notion-Version header is required on every request and pinned in each script (currently `2022-06-28`; bump as needed when API contracts evolve).

## API quirks worth knowing

See [`references/notion-api-gotchas.md`](references/notion-api-gotchas.md) for the durable per-app knowledge agents have surfaced — UUID extraction from URLs, parent-type shapes, rich-text array structure, pagination cursors, database-sharing-with-integration requirement.

## Eval cases

See [`evals/evals.json`](evals/evals.json) — representative tasks + assertions per the [agentskills.io eval methodology](https://agentskills.io/skill-creation/evaluating-skills). Run them with the repo-level harness (see [`EVALUATING.md`](../../EVALUATING.md)):

```bash
ANTHROPIC_API_KEY=… NOTION_ZAPIER_CONNECTION_ID=… npm run evals -- apps/notion
```

Notion-specific fixture: a real workspace with a `Q4 planning` page and a `Projects` database (Title + Status-select schema, including an `In progress` option), both reachable through the Zapier connection (or, in direct mode, both shared with the integration that owns `NOTION_TOKEN`).
