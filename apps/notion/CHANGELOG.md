# @zapier/notion-connector

## 0.1.0

### Minor Changes

- 1b76518: Add a shipped `preflight.sh` harness-compatibility check to every connector.

  Agents run `./preflight.sh` once at the start of a session to learn how to run the connector's TypeScript scripts in the current harness, then run scripts directly (re-running only after an environment change or in a fresh session). It answers one question — how do I run TS here? — by detecting a usable runtime (Node 22.18+ or Bun) and that the declared dependencies resolve, then printing the exact command (`PREFLIGHT_STATUS: READY` + `PREFLIGHT_RUNNER`), or a single `NEEDS_ACTION` bootstrap step. When deps are missing it disambiguates the two sandbox failures that block an install — a read-only connector dir (run unsandboxed or grant write access) vs. a blocked home dir (point the package cache inside the connector dir) — so the recommendation names the real fix instead of npm's misleading "root-owned files" message. It deliberately does not probe the network or auth — the scripts own that, surfacing a clear error on a missing credential or a blocked host, and a script's own network failure is the signal to fall back to Zapier's remote MCP (`mcp.zapier.com`).

  The script is canonical in `connector-assets/` and kept byte-identical across connectors via `pnpm run ensure-connector-assets`.

- e18755b: Initial release of `@zapier/notion-connector`.
- 7268c5e: Rebuild the Notion connector through the Factory pipeline on Notion's 2025-09-03 data-sources API model (was 3 hand-authored tools, now 23). Tools span search, page / database / data-source reads, page and block writes (create / update / append / delete), database and data-source schema management, comments, and users. Single-token bearer auth; shared `lib/` (`notionFetch` for the version header + `ConnectorHttpError` mapping, `notionId` for URL/id normalization); clean-room `references/`.
- 6209a75: Make `@zapier/zapier-sdk` a required (non-optional) peer dependency of every connector to simplify onboarding (STAFF-4181). It stays a peer dependency — the host still owns the single installed copy — but dropping the `peerDependenciesMeta.optional` flag means a plain `npm install` now pulls the SDK automatically, so an agent no longer has to run a second install before switching a connector to Zapier mode.

  `ensurePackage` now strips a stale `optional: true` from `@zapier/zapier-sdk` (and prunes an empty `peerDependenciesMeta` block) instead of adding it. The connector validator (`@zapier/connectors-ref`) follows automatically.

  Also widens the declared `@zapier/zapier-sdk` range from `^0.59.0` to `>=0.59.0 <1.0.0`. On a `0.x` package a caret pins to the minor (`^0.59.0` === `>=0.59.0 <0.60.0`), which rejected every current SDK (npm `latest` is already 0.70.x) and would force a connector-wide bump on every SDK minor. The floor + major ceiling tolerates the frequent pre-1.0 minors while still excluding the potentially-breaking `1.x` line.

  Removes the now-unused `optionalPackages` resolver feature from the SDK: the `optionalPackages` field on `ConnectionResolver` types, the `--help` "optional package not installed" annotations, and the `zapierConnectionResolver` declaration. The lazy `@zapier/zapier-sdk` import and the clear runtime error from `build-zapier-fetch` remain as a safety net.

- 357bc84: Unify the connection interface across CLI, MCP, and the SDK/Node-import surface on a single `<resolverName>:<resolverValue>` string.
  - CLI & MCP accept `--connection [<resolver>:]<value>` and `--<slot>-connection [<resolver>:]<value>` flags (the `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver). The value names an env var or a connection id — never the secret itself — so it is safe on the command line. `--help` documents the two-part contract, the optional prefix, and the available resolvers.
  - The SDK takes `{ connection: "[<resolver>:]<value>" }` or `{ connections: { <slot>: "[<resolver>:]<value>" } }`; the two are mutually exclusive. The old fetch-handle / object-handle shape is gone.
  - A bare value (no `<resolver>:` prefix) is claimed by the first resolver whose `canHandle` accepts it (e.g. the Zapier resolver claims UUID-shaped values).
  - `defineBearerTokenResolver` is renamed to `defineEnvTokenResolver`. It has no default env key — the `resolverValue` _is_ the env-var name (`process.env[resolverValue]`). Its resolver name defaults to `env` (configurable) and a `scheme` option controls the `Authorization` header word.
  - The previous composed-env variable scheme (`<SLOT>_<KEY>_<RESOLVER>[_<SUFFIX>]`) and `buildRunOptionsFromEnv` are removed; there is no zero-argument default — an explicit connection string (or an auto-claimed bare value) is always required.

### Patch Changes

- af02524: Ship compiled JS for the npm install route; add `prepare` build for git-clone library imports.

  `@zapier/notion-connector`: adds a tsup build that emits `dist/index.js` and `dist/cli.js`. The `exports` field now points at the compiled library (`dist/index.js`), fixing `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` on all Node versions when the connector is imported as a node module. A plain-JS proxy (`cli.js`) is the new `bin` entry — it runs `dist/cli.js` when present (npm install, any Node) or falls through to source `cli.ts` (git-clone route, Node 22.18+/Bun, no build required). A `prepare` lifecycle hook (`node cli.js build`) auto-builds `dist/` on git-clone installs so that `import { search } from "@zapier/notion-connector"` works even when the package was installed from a git/file source. The `build` subcommand is handled directly in `cli.js` (no TS loading needed) and exits 0 on failure so installs never break in restricted environments.

  `@zapier/connectors-ref`: updates the connector contract to require `exports` → `{ import: "./dist/index.js", types: "./index.ts" }` and `bin` → `./cli.js`. Rejects raw `.ts` entry points. Adds `dist/` and `cli.js` to required `files`.

- 0e3316d: Rename script files and tool names to camelCase to comply with the new connector naming convention enforced by `@zapier/connectors-sdk` and `@zapier/connectors-ref`.
  - `scripts/copy-page.ts` → `scripts/copyPage.ts`, `name: "copy_page"` → `"copyPage"`
  - `scripts/create-database-item.ts` → `scripts/createDatabaseItem.ts`, `name: "create_database_item"` → `"createDatabaseItem"`

- 75e6a4e: Publish connectors with restricted npm access instead of public.

  Per legal review (STAFF-4104), connectors must not be world-public on npm. The connector `package.json` fundamentals (`applyPackageFundamentals` in `@zapier/connectors-dev`) now require and write `publishConfig.access: "restricted"`, so `pnpm run check` keeps every connector restricted. `@zapier/slack-connector` and `@zapier/notion-connector` are updated to match.

- 872c151: Remove `inputDependencies` from `defineTool` and all `ToolDefinition` types.

  The `inputDependencies` field and `TInputDependencies` generic parameter have been stripped from `DefineToolConfig*`, `ToolDefinitionBase`, and `AnyToolDefinition`. The corresponding `_meta["zapier:inputDependencies"]` emission has been removed from `toMcpTool` and `toMcpServerTool`. The feature will be redesigned and reintroduced once the dependent-field API shape has been finalised.

- 9f0d7fe: Wrap every script run in a `{ data, meta }` envelope and report what output validation did. `run` (and therefore the package/script CLI's JSON stdout, the imported SDK return value, and the MCP tool's `structuredContent`) now resolves to `{ data, meta }` instead of the bare output. `meta.outputValidation` is a discriminated union: `{ skipped: false, droppedPaths: null }` when validation removed nothing, `{ skipped: false, droppedPaths: string[], instruction }` when a stripping `outputSchema` silently dropped keys the API returned (the exact dot/bracket paths plus a recovery hint), or `{ skipped: true }` when validation was bypassed. A hard validation failure now throws an `Error` whose message names output validation and carries the original `ZodError` on `.cause`.

  Add a single canonical `skipOutputValidation` escape hatch — CLI flag `--skipOutputValidation`, SDK run option `skipOutputValidation: true`, and (on MCP) a nested `meta: { skipOutputValidation: true }` tool argument. On MCP the flag must travel as a declared input parameter because request-level `_meta` is protocol-reserved and not reachable by the model through normal clients; it is nested under a single optional `meta` object (which carries its own description, since some clients only render top-level input properties in their preview) so future control flags slot in without reserving more names, and the dispatch callback strips `meta` back off before the author's `run`. The `meta` key is reserved SDK-wide — `defineTool` throws if a script's `inputSchema` declares it — so the injected control object can never silently shadow a real input field. The escape hatch totally bypasses output validation (the schema is not run at all) and returns the author's raw output as `data`; input parsing always stays strict. CLI `--help`, the MCP tool `inputSchema`, and the MCP output-schema descriptor advertise the wrapped envelope and the flag. (STAFF-3974)

- 64dfa81: Add a standardized `ConnectorHttpError` plus a `throwForStatus` helper for transparent API error reporting.

  Connectors no longer hand-roll lossy `throw new Error("X 400: " + body)` blocks. `@zapier/connectors-sdk` now exports:
  - **`ConnectorHttpError`** — an `Error` that carries the `response` it failed on (status, statusText, headers, parsed body). Nothing is promoted off the response: the machine error code, `Retry-After`, etc. all stay in `response.body` / `response.headers` for callers to read. Its `toString()` renders a readable multi-line summary (message, the connector frame it was thrown from, the HTTP `status` on its own line — always, so a custom message never has to restate it — the response headers verbatim, and a pretty-printed body), which the connector CLI prints instead of a raw stack trace.
  - **`throwForStatus(res, message?)`** — a delegator: on a non-2xx `Response` it reads the body and throws a `ConnectorHttpError`; on 2xx it returns the `Response` untouched. Named after the `zapier-platform` CLI idiom, but a standalone helper that does not augment `Response`. The optional `message` names the call site (e.g. `"Failed to read the source page"`) for scripts that make several requests; it never needs to include the status, which `toString()` always renders.
  - **`ConnectorHttpError.fromResponseBody(res, body, { message? })`** — the control path for connectors whose failure arrives in a 200 body (e.g. Slack's `{ ok: false }`, where the body is read before the error is known), or that want to shape the response themselves.
  - **`isConnectorHttpError(value)`** — a `Symbol.for`-branded recognizer that works across bundles (each `apps/*` connector bundles the SDK standalone, so `instanceof` is unreliable).

  Both execution surfaces render it brand-aware: the CLI prints `toString()`, and the local MCP server returns an `isError` tool result carrying the failure in two `content` blocks — the readable `toString()` and the captured `response` (status/headers/body) as JSON — so an agent gets the full, machine-readable error context instead of just `err.message`. The response rides in `content`, **not** `structuredContent`: an MCP client validates any `structuredContent` against the script's _success_ `outputSchema` even on `isError` results, so an error payload there is rejected with a `-32602` before it ever reaches the agent.

  The Notion and Slack connectors are refactored onto the new API: Notion uses `throwForStatus` (with call-site messages where one script makes several requests, e.g. `copyPage`'s read vs. write), while Slack builds errors via `fromResponseBody` with its human-readable messages (the Slack error code and `missing_scope` context remain in the message and the captured body; the status is no longer worked into the message since `toString()` renders it).

- a463948: Fix connector CLI dispatch regression on Node 22.18+

  Add an esbuild plugin to the `cli.ts` tsup entry that externalises
  `./index.ts → ./index.js`, preventing scripts from being inlined into
  `dist/cli.js`. Without this, every script's top-level
  `await handleIfScriptMain(import.meta, …)` fired when the dispatch CLI
  started (because `import.meta.main` is `true` for the bundle entry in
  Node 22.18+), causing all scripts to execute instead of routing via
  `runDispatchCli`.

- 3757d42: Ban bare `z.unknown()` in connector schemas (STAFF-4101). `connectors-ref` now rejects a bare `z.unknown()` on either input or output — including in value position (`z.array(z.unknown())`, `z.record(_, z.unknown())`) — the same way it rejects untyped `.loose()` passthrough, because it compiles to an empty `{}` JSON Schema that tells an agent nothing. Use `z.json()` for genuinely arbitrary JSON. Updates the Notion `search` (real result shape + `properties`) / `createDatabaseItem` and Slack `blocks` schemas to comply.
- 8dc0213: Remove the four tool-surface helpers from the connector public surface.

  `toMcpTool`, `toMcpServerTool`, `toChatCompletionTool`, and `toResponsesTool` are no longer attached to the `defineConnector` return value (`ConnectorDefinition`), and the `toChatCompletionTool` / `toResponsesTool` / `toMcpTool` surface modules have been removed. They backed the "bring-your-own MCP server" and "OpenAI function tool" integrations, which are not part of the supported interface set (CLI, local MCP server, and the SDK import). Narrowing the surface keeps the interface story simple while these paths are reconsidered; they can be reintroduced later.

  The supported way to expose scripts as MCP tools remains the bundled local MCP server (`npx @zapier/<x>-connector mcp` / `serveMcpStdio`), which continues to register each script internally. `connector.buildRunOptionsFromEnv`, `connector.scripts`, and `connector.connectionResolvers` are unchanged.

- 31ac606: Rename the `throwForStatus` helper to `throwIfNotOk`.

  The new name reflects what the helper actually does — it throws a `ConnectorHttpError` when `res.ok` is false (a non-2xx response) and returns the `Response` untouched otherwise — rather than echoing the `zapier-platform` CLI's `response.throwForStatus()` idiom it was originally named after. The signature is unchanged: `throwIfNotOk(res, message?)`. The Notion connector is updated to import and call `throwIfNotOk`.

- a126ab5: Drop the stale "lists any optional packages still needed" guidance (and the `@zapier/zapier-sdk [not installed — run npm install …]` example) from connector `SKILL.md` files and the scaffold template. The `optionalPackages` `--help` annotation was removed in STAFF-4181 now that `@zapier/zapier-sdk` is a required peer dependency installed by `npm install`, so the pre-flight docs no longer describe it.
- Updated dependencies [342f3d8]
- Updated dependencies [07e5bce]
- Updated dependencies [78fb311]
- Updated dependencies [daadb19]
- Updated dependencies [0126a1c]
- Updated dependencies [75d1e8d]
- Updated dependencies [4cab46f]
- Updated dependencies [a5cc21e]
- Updated dependencies [d781d8f]
- Updated dependencies [872c151]
- Updated dependencies [9f0d7fe]
- Updated dependencies [64dfa81]
- Updated dependencies [6ccdcb7]
- Updated dependencies [cafefb9]
- Updated dependencies [e898bab]
- Updated dependencies [f6493b0]
- Updated dependencies [8dc0213]
- Updated dependencies [31ac606]
- Updated dependencies [6209a75]
- Updated dependencies [357bc84]
- Updated dependencies [ae5b812]
- Updated dependencies [ae21738]
- Updated dependencies [3f494f7]
- Updated dependencies [c94ac3b]
- Updated dependencies [eef7240]
- Updated dependencies [61ccad1]
- Updated dependencies [7f383e0]
- Updated dependencies [58b221b]
- Updated dependencies [92b4466]
  - @zapier/connectors-sdk@0.1.0
