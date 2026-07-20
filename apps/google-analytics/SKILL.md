---
name: google-analytics
description: Agent-callable Google Analytics 4 (GA4) tools — run analytics reports, discover the dimensions and metrics a property supports, navigate accounts and properties, manage key events and custom dimensions/metrics, and send Measurement Protocol events. Use when the user mentions Google Analytics or GA4, or wants website/app traffic, conversion, or reporting data — including requests that don't name GA4 explicitly, e.g. how many users visited last week, top pages by country.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/google-analytics/SKILL.md
  title: Google Analytics
  api-docs: https://developers.google.com/analytics/devguides/reporting/data/v1
  zapier-app-key: GoogleAnalytics4CLIAPI
---

# Google Analytics

_Independent, unofficial connector for Google Analytics. Not affiliated with, endorsed by, or sponsored by Google Analytics. "Google Analytics" is a trademark of its owner, used only to identify the service this connector works with._

Google Analytics 4 (GA4) exposes two OAuth-authenticated APIs — the Data API for reporting and the Admin API for configuration — plus the Measurement Protocol for sending events. This connector wraps all three: run and explore analytics reports, discover the dimensions and metrics a property supports, walk the account → property tree, manage key events (conversions) and custom dimensions/metrics, and send server-side events. It is reporting-first — `runReport` is the core tool, with `getMetadata` and `checkCompatibility` underneath so you can compose a valid report without guessing field names.

Every property-scoped tool takes `propertyId` — the numeric GA4 property id (e.g. `123456`), **not** the `G-XXXXXXX` measurement id. Resolve it once with `listAccountSummaries`.

## When to use this

- **Reporting** — run historical (`runReport`) or realtime (`runRealtimeReport`) reports, discover valid dimension/metric names (`getMetadata`), and check whether a field combination is valid (`checkCompatibility`).
- **Navigation** — find which property to operate on and read its configuration (`listAccountSummaries`, `getProperty`, `listDataStreams`).
- **Key events (conversions)** — list, get, create, and delete the events GA4 counts as conversions.
- **Custom definitions** — list, create, and archive custom dimensions and custom metrics.
- **Measurement Protocol** — manage a data stream's send secrets and send server-side events (`listMeasurementProtocolSecrets`, `createMeasurementProtocolSecret`, `sendEvent`).

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__google-analytics__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill google-analytics` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`. On older Node, run `node cli.js --help` anyway: it detects your runtime and prints how to run without upgrading (the prebuilt npm package, or another runtime) — don't skip the connector just because Node is old.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

Every script uses the single `google-analytics` connection. Most take a numeric `propertyId` from `listAccountSummaries`.

| Script                                       | Script name                       | Connections      | Description                                                                                                          |
| -------------------------------------------- | --------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `scripts/runReport.ts`                       | `runReport`                       | google-analytics | Run a GA4 report — dimensions + metrics over date ranges, optionally filtered/sorted. The core analytics tool.       |
| `scripts/runRealtimeReport.ts`               | `runRealtimeReport`               | google-analytics | Run a realtime report over roughly the last 30 minutes of activity. No date ranges.                                  |
| `scripts/getMetadata.ts`                     | `getMetadata`                     | google-analytics | List the dimensions and metrics a property supports, with API + UI names. Call before `runReport`.                   |
| `scripts/checkCompatibility.ts`              | `checkCompatibility`              | google-analytics | Check whether a set of dimensions and metrics can be combined in one report. Recovery for incompatible-field errors. |
| `scripts/listAccountSummaries.ts`            | `listAccountSummaries`            | google-analytics | List every accessible account with its properties. The entry point for resolving `propertyId`.                       |
| `scripts/getProperty.ts`                     | `getProperty`                     | google-analytics | Get a property's config — display name, currency, timezone, industry category.                                       |
| `scripts/listDataStreams.ts`                 | `listDataStreams`                 | google-analytics | List a property's data streams; web streams carry the `G-` measurement id.                                           |
| `scripts/listKeyEvents.ts`                   | `listKeyEvents`                   | google-analytics | List a property's key events (important business actions).                                                           |
| `scripts/getKeyEvent.ts`                     | `getKeyEvent`                     | google-analytics | Get one key event by id.                                                                                             |
| `scripts/createKeyEvent.ts`                  | `createKeyEvent`                  | google-analytics | Mark an event name as a key event (an important business action).                                                    |
| `scripts/deleteKeyEvent.ts`                  | `deleteKeyEvent`                  | google-analytics | Delete a key event (only ones with `deletable: true`). Destructive.                                                  |
| `scripts/listCustomDimensions.ts`            | `listCustomDimensions`            | google-analytics | List a property's custom dimensions.                                                                                 |
| `scripts/createCustomDimension.ts`           | `createCustomDimension`           | google-analytics | Create a custom dimension on an event/user parameter.                                                                |
| `scripts/archiveCustomDimension.ts`          | `archiveCustomDimension`          | google-analytics | Archive a custom dimension, freeing its slot (archive only — no delete method). Destructive.                         |
| `scripts/listCustomMetrics.ts`               | `listCustomMetrics`               | google-analytics | List a property's custom metrics.                                                                                    |
| `scripts/createCustomMetric.ts`              | `createCustomMetric`              | google-analytics | Create a custom metric on a numeric event parameter.                                                                 |
| `scripts/archiveCustomMetric.ts`             | `archiveCustomMetric`             | google-analytics | Archive a custom metric, freeing its slot (archive only — no delete method). Destructive.                            |
| `scripts/listMeasurementProtocolSecrets.ts`  | `listMeasurementProtocolSecrets`  | google-analytics | List a data stream's Measurement Protocol secrets, including their values.                                           |
| `scripts/createMeasurementProtocolSecret.ts` | `createMeasurementProtocolSecret` | google-analytics | Create a Measurement Protocol secret on a data stream.                                                               |
| `scripts/sendEvent.ts`                       | `sendEvent`                       | google-analytics | Send events to GA4 via the Measurement Protocol. Authenticates with a stream `apiSecret`, not OAuth.                 |

> **Measurement Protocol secrets — create and list only.** This connector can create and list Measurement Protocol secrets, but **cannot delete or rotate them**. To delete a secret, use the GA4 Admin UI: Admin → Data streams → (select stream) → Measurement Protocol API secrets.

## Disambiguation & refusals

**Resolving a property by name.** Tools take a numeric `propertyId`, not a name. Resolve it with `listAccountSummaries` and count _exact_ (case-insensitive) matches on `propertySummaries[].displayName`: exactly one match → use its `propertyId` and act; two or more that tie → stop, list the candidates with their `propertyId` (and parent account), and ask which one. Never silently pick. The same rule applies to resolving a `keyEventId` / `customDimensionId` / `customMetricId` / `dataStreamId` from the matching `list*` tool.

**Unsupported operations — say so and stop; don't substitute another tool.** This connector does **not** create or delete GA4 accounts or properties, manage user access/permissions, or read Universal Analytics (UA) data — and it exposes no funnel, pivot, cohort, or audience-export reports, and no audience or calculated-metric management. If asked for one of these, say it isn't supported rather than repurposing a different tool or reporting a success you didn't perform. (For a report the flat `runReport` can't express, say so — don't fake a pivot by post-processing rows.)

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

The connector uses a single connection, `google-analytics`, carrying a Google OAuth 2.0 access token sent as `Authorization: Bearer <token>`. The connection carries the full `analytics` scope — which the Data API accepts for reporting reads, alongside `analytics.readonly` — plus `analytics.edit` for the Admin write tools, so both read and write tools work with one connection. A read-only deployment can grant just `analytics.readonly`, in which case the write tools return `PERMISSION_DENIED`.

- **`zapier:<connection-id>`** _(recommended)_ — Zapier-managed auth: route through a Zapier Google Analytics connection and the Zapier auth, retries, and governance layer injects and transparently refreshes the token. Find the id with `npx zapier-sdk list-connections GoogleAnalytics4CLIAPI` (run `login` first if unauthenticated; add `--json` for machine output).
- **`env:GOOGLE_ANALYTICS_ACCESS_TOKEN`** _(fallback)_ — read a Google OAuth access token from that environment variable and send it as the bearer. The value is the env-var NAME, not the token. **Caveat: Google access tokens are short-lived and this resolver does NOT refresh them** — direct mode suits short-lived/testing use; the Zapier-managed connection refreshes automatically.

**`sendEvent` is the exception.** Its real credential is the per-call `apiSecret` input (a data stream's Measurement Protocol secret, from `listMeasurementProtocolSecrets`), not the connection. The OAuth token is still attached to the request but is not used by the Measurement Protocol endpoint, which authenticates via `api_secret` — so `sendEvent` still requires the `google-analytics` connection to be present.

## Running scripts

After `npm install`, run a script by name with `node cli.js run <script>`, or execute its file directly — both take the same arguments and both accept `--help`. Always run a script's `--help` first to learn its exact input schema and connections, then invoke it:

```bash
# default — via the entry point; self-checks readiness and prints friendly diagnostics
node cli.js run <script> '<input-json>' --connection [<resolver>:]<value>
# shorthand — runs the script file directly (same args, same Node 22.18+ need, no readiness check)
./scripts/<script>.ts '<input-json>' --connection [<resolver>:]<value>
```

When a harness can't execute scripts directly, fall back to MCP — `node cli.js mcp` serves every script as a tool over stdio. Register it as a local MCP server in your client: the stanza is harness-specific (an `mcpServers` entry in Claude Desktop, Cursor, Claude Code, …) with `command: "node"`, `args: ["cli.js", "mcp"]`, run from this directory. Run `node cli.js mcp --help` for auth options. Add the stanza yourself if you can edit the client's MCP config; otherwise guide the user. If a local server isn't possible, guide the user to use Zapier's remote MCP servers at <https://mcp.zapier.com> instead.

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; run the script's `--help` to see that exact schema).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, append `--skipOutputDataValidation` to the script invocation. Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, append `--filterOutputData '<jq>'` — a jq expression that post-processes `data`. The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

## References

| Reference                                                                                | When to load                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [references/google-analytics-api-gotchas.md](references/google-analytics-api-gotchas.md) | Before or while calling any tool. Covers the error envelope + recovery table, the numeric `propertyId` rule, report row limits & paging, date-range/timezone rules, string metric values and their types, `(other)`-row and thresholding caveats, dimension vs metric filters, custom-dimension/metric scopes/units/limits and the archive-only removal, key-event vs conversion terminology, and the Measurement Protocol identity, payload limits, and no-error-codes/validation behavior. |
| [references/use-as-recipe.md](references/use-as-recipe.md)                               | Loaded by a harness writing its own code against the GA4 API (can't load the tools, run the CLI, or import the package) — request patterns, response shapes, and pointers into the gotchas.                                                                                                                                                                                                                                                                                                  |
