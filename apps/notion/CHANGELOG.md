# @zapier/notion-connector

## 0.1.0-experimental.15

### Minor Changes

- 357bc84: Unify the connection interface across CLI, MCP, and the SDK/Node-import surface on a single `<resolverName>:<resolverValue>` string.
  - CLI & MCP accept `--connection [<resolver>:]<value>` and `--<slot>-connection [<resolver>:]<value>` flags (the `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver). The value names an env var or a connection id — never the secret itself — so it is safe on the command line. `--help` documents the two-part contract, the optional prefix, and the available resolvers.
  - The SDK takes `{ connection: "[<resolver>:]<value>" }` or `{ connections: { <slot>: "[<resolver>:]<value>" } }`; the two are mutually exclusive. The old fetch-handle / object-handle shape is gone.
  - A bare value (no `<resolver>:` prefix) is claimed by the first resolver whose `canHandle` accepts it (e.g. the Zapier resolver claims UUID-shaped values).
  - `defineBearerTokenResolver` is renamed to `defineEnvTokenResolver`. It has no default env key — the `resolverValue` _is_ the env-var name (`process.env[resolverValue]`). Its resolver name defaults to `env` (configurable) and a `scheme` option controls the `Authorization` header word.
  - The previous composed-env variable scheme (`<SLOT>_<KEY>_<RESOLVER>[_<SUFFIX>]`) and `buildRunOptionsFromEnv` are removed; there is no zero-argument default — an explicit connection string (or an auto-claimed bare value) is always required.

### Patch Changes

- Updated dependencies [357bc84]
- Updated dependencies [ae5b812]
  - @zapier/connectors-sdk@0.1.0-experimental.18

## 0.1.0-experimental.14

### Patch Changes

- a126ab5: Drop the stale "lists any optional packages still needed" guidance (and the `@zapier/zapier-sdk [not installed — run npm install …]` example) from connector `SKILL.md` files and the scaffold template. The `optionalPackages` `--help` annotation was removed in STAFF-4181 now that `@zapier/zapier-sdk` is a required peer dependency installed by `npm install`, so the pre-flight docs no longer describe it.

## 0.1.0-experimental.13

### Minor Changes

- 6209a75: Make `@zapier/zapier-sdk` a required (non-optional) peer dependency of every connector to simplify onboarding (STAFF-4181). It stays a peer dependency — the host still owns the single installed copy — but dropping the `peerDependenciesMeta.optional` flag means a plain `npm install` now pulls the SDK automatically, so an agent no longer has to run a second install before switching a connector to Zapier mode.

  `ensurePackage` now strips a stale `optional: true` from `@zapier/zapier-sdk` (and prunes an empty `peerDependenciesMeta` block) instead of adding it. The connector validator (`@zapier/connectors-ref`) follows automatically.

  Also widens the declared `@zapier/zapier-sdk` range from `^0.59.0` to `>=0.59.0 <1.0.0`. On a `0.x` package a caret pins to the minor (`^0.59.0` === `>=0.59.0 <0.60.0`), which rejected every current SDK (npm `latest` is already 0.70.x) and would force a connector-wide bump on every SDK minor. The floor + major ceiling tolerates the frequent pre-1.0 minors while still excluding the potentially-breaking `1.x` line.

  Removes the now-unused `optionalPackages` resolver feature from the SDK: the `optionalPackages` field on `ConnectionResolver` types, the `--help` "optional package not installed" annotations, and the `zapierConnectionResolver` declaration. The lazy `@zapier/zapier-sdk` import and the clear runtime error from `build-zapier-fetch` remain as a safety net.

### Patch Changes

- Updated dependencies [6209a75]
  - @zapier/connectors-sdk@0.1.0-experimental.17

## 0.1.0-experimental.12

### Patch Changes

- 8dc0213: Remove the four tool-surface helpers from the connector public surface.

  `toMcpTool`, `toMcpServerTool`, `toChatCompletionTool`, and `toResponsesTool` are no longer attached to the `defineConnector` return value (`ConnectorDefinition`), and the `toChatCompletionTool` / `toResponsesTool` / `toMcpTool` surface modules have been removed. They backed the "bring-your-own MCP server" and "OpenAI function tool" integrations, which are not part of the supported interface set (CLI, local MCP server, and the SDK import). Narrowing the surface keeps the interface story simple while these paths are reconsidered; they can be reintroduced later.

  The supported way to expose scripts as MCP tools remains the bundled local MCP server (`npx @zapier/<x>-connector mcp` / `serveMcpStdio`), which continues to register each script internally. `connector.buildRunOptionsFromEnv`, `connector.scripts`, and `connector.connectionResolvers` are unchanged.

- Updated dependencies [8dc0213]
  - @zapier/connectors-sdk@0.1.0-experimental.16

## 0.1.0-experimental.11

### Patch Changes

- 64dfa81: Add a standardized `ConnectorHttpError` plus a `throwForStatus` helper for transparent API error reporting.

  Connectors no longer hand-roll lossy `throw new Error("X 400: " + body)` blocks. `@zapier/connectors-sdk` now exports:
  - **`ConnectorHttpError`** — an `Error` that carries the `response` it failed on (status, statusText, headers, parsed body). Nothing is promoted off the response: the machine error code, `Retry-After`, etc. all stay in `response.body` / `response.headers` for callers to read. Its `toString()` renders a readable multi-line summary (message, the connector frame it was thrown from, the HTTP `status` on its own line — always, so a custom message never has to restate it — the response headers verbatim, and a pretty-printed body), which the connector CLI prints instead of a raw stack trace.
  - **`throwForStatus(res, message?)`** — a delegator: on a non-2xx `Response` it reads the body and throws a `ConnectorHttpError`; on 2xx it returns the `Response` untouched. Named after the `zapier-platform` CLI idiom, but a standalone helper that does not augment `Response`. The optional `message` names the call site (e.g. `"Failed to read the source page"`) for scripts that make several requests; it never needs to include the status, which `toString()` always renders.
  - **`ConnectorHttpError.fromResponseBody(res, body, { message? })`** — the control path for connectors whose failure arrives in a 200 body (e.g. Slack's `{ ok: false }`, where the body is read before the error is known), or that want to shape the response themselves.
  - **`isConnectorHttpError(value)`** — a `Symbol.for`-branded recognizer that works across bundles (each `apps/*` connector bundles the SDK standalone, so `instanceof` is unreliable).

  Both execution surfaces render it brand-aware: the CLI prints `toString()`, and the local MCP server returns an `isError` tool result carrying the failure in two `content` blocks — the readable `toString()` and the captured `response` (status/headers/body) as JSON — so an agent gets the full, machine-readable error context instead of just `err.message`. The response rides in `content`, **not** `structuredContent`: an MCP client validates any `structuredContent` against the script's _success_ `outputSchema` even on `isError` results, so an error payload there is rejected with a `-32602` before it ever reaches the agent.

  The Notion and Slack connectors are refactored onto the new API: Notion uses `throwForStatus` (with call-site messages where one script makes several requests, e.g. `copyPage`'s read vs. write), while Slack builds errors via `fromResponseBody` with its human-readable messages (the Slack error code and `missing_scope` context remain in the message and the captured body; the status is no longer worked into the message since `toString()` renders it).

- Updated dependencies [64dfa81]
  - @zapier/connectors-sdk@0.1.0-experimental.15

## 0.1.0-experimental.10

### Patch Changes

- 93d8cca: Bump `@zapier/connectors-sdk` dependency to `0.1.0-experimental.14`.

## 0.1.0-experimental.9

### Patch Changes

- 75e6a4e: Publish connectors with restricted npm access instead of public.

  Per legal review (STAFF-4104), connectors must not be world-public on npm. The connector `package.json` fundamentals (`applyPackageFundamentals` in `@zapier/connectors-dev`) now require and write `publishConfig.access: "restricted"`, so `pnpm run check` keeps every connector restricted. `@zapier/slack-connector` and `@zapier/notion-connector` are updated to match.

## 0.1.0-experimental.8

### Patch Changes

- 3757d42: Ban bare `z.unknown()` in connector schemas (STAFF-4101). `connectors-ref` now rejects a bare `z.unknown()` on either input or output — including in value position (`z.array(z.unknown())`, `z.record(_, z.unknown())`) — the same way it rejects untyped `.loose()` passthrough, because it compiles to an empty `{}` JSON Schema that tells an agent nothing. Use `z.json()` for genuinely arbitrary JSON. Updates the Notion `search` (real result shape + `properties`) / `createDatabaseItem` and Slack `blocks` schemas to comply.

## 0.1.0-experimental.7

### Patch Changes

- 6cea662: Bump `@zapier/connectors-sdk` dependency to `0.1.0-experimental.12`.

## 0.1.0-experimental.6

### Patch Changes

- a463948: Fix connector CLI dispatch regression on Node 22.18+

  Add an esbuild plugin to the `cli.ts` tsup entry that externalises
  `./index.ts → ./index.js`, preventing scripts from being inlined into
  `dist/cli.js`. Without this, every script's top-level
  `await handleIfScriptMain(import.meta, …)` fired when the dispatch CLI
  started (because `import.meta.main` is `true` for the bundle entry in
  Node 22.18+), causing all scripts to execute instead of routing via
  `runDispatchCli`.

## 0.1.0-experimental.5

### Patch Changes

- af02524: Ship compiled JS for the npm install route; add `prepare` build for git-clone library imports.

  `@zapier/notion-connector`: adds a tsup build that emits `dist/index.js` and `dist/cli.js`. The `exports` field now points at the compiled library (`dist/index.js`), fixing `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` on all Node versions when the connector is imported as a node module. A plain-JS proxy (`cli.js`) is the new `bin` entry — it runs `dist/cli.js` when present (npm install, any Node) or falls through to source `cli.ts` (git-clone route, Node 22.18+/Bun, no build required). A `prepare` lifecycle hook (`node cli.js build`) auto-builds `dist/` on git-clone installs so that `import { search } from "@zapier/notion-connector"` works even when the package was installed from a git/file source. The `build` subcommand is handled directly in `cli.js` (no TS loading needed) and exits 0 on failure so installs never break in restricted environments.

  `@zapier/connectors-ref`: updates the connector contract to require `exports` → `{ import: "./dist/index.js", types: "./index.ts" }` and `bin` → `./cli.js`. Rejects raw `.ts` entry points. Adds `dist/` and `cli.js` to required `files`.

## 0.1.0-experimental.4

### Patch Changes

- d5b6ee9: Bump `@zapier/connectors-sdk` dependency to `0.1.0-experimental.10`.

## 0.1.0-experimental.3

### Patch Changes

- 0e3316d: Rename script files and tool names to camelCase to comply with the new connector naming convention enforced by `@zapier/connectors-sdk` and `@zapier/connectors-ref`.
  - `scripts/copy-page.ts` → `scripts/copyPage.ts`, `name: "copy_page"` → `"copyPage"`
  - `scripts/create-database-item.ts` → `scripts/createDatabaseItem.ts`, `name: "create_database_item"` → `"createDatabaseItem"`

- Updated dependencies [342f3d8]
  - @zapier/connectors-sdk@0.1.0-experimental.9

## 0.1.0-experimental.2

### Patch Changes

- 872c151: Remove `inputDependencies` from `defineTool` and all `ToolDefinition` types.

  The `inputDependencies` field and `TInputDependencies` generic parameter have been stripped from `DefineToolConfig*`, `ToolDefinitionBase`, and `AnyToolDefinition`. The corresponding `_meta["zapier:inputDependencies"]` emission has been removed from `toMcpTool` and `toMcpServerTool`. The feature will be redesigned and reintroduced once the dependent-field API shape has been finalised.

- Updated dependencies [872c151]
  - @zapier/connectors-sdk@0.1.0-experimental.8

## 0.1.0-experimental.1

### Patch Changes

- 002076a: Bump `@zapier/connectors-sdk` dependency to `^0.1.0-experimental.7`.

  The version published on npm (`0.1.0-experimental.0`) still references
  `@zapier/connectors-sdk@0.1.0-experimental.3`. This patch re-publishes the
  connector so installers get the up-to-date SDK range.
