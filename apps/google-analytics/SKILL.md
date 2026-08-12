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

<!-- BEGIN:skill-intro -->

Google Analytics 4 (GA4) exposes two OAuth-authenticated APIs — the Data API for reporting and the Admin API for configuration — plus the Measurement Protocol for sending events. This connector wraps all three: run and explore analytics reports, discover the dimensions and metrics a property supports, walk the account → property tree, manage key events (conversions) and custom dimensions/metrics, and send server-side events. It is reporting-first — `runReport` is the core tool, with `getMetadata` and `checkCompatibility` underneath so you can compose a valid report without guessing field names.

Every property-scoped tool takes `propertyId` — the numeric GA4 property id (e.g. `123456`), **not** the `G-XXXXXXX` measurement id. Resolve it once with `listAccountSummaries`.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Google Analytics. Not affiliated with, endorsed by, or sponsored by Google Analytics. "Google Analytics" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:skill-intro -->

## When to use this

<!-- BEGIN:skill-use-cases -->

- **Reporting** — run historical (`runReport`) or realtime (`runRealtimeReport`) reports, discover valid dimension/metric names (`getMetadata`), and check whether a field combination is valid (`checkCompatibility`).
- **Navigation** — find which property to operate on and read its configuration (`listAccountSummaries`, `getProperty`, `listDataStreams`).
- **Key events (conversions)** — list, get, create, and delete the events GA4 counts as conversions.
- **Custom definitions** — list, create, and archive custom dimensions and custom metrics.
- **Measurement Protocol** — manage a data stream's send secrets and send server-side events (`listMeasurementProtocolSecrets`, `createMeasurementProtocolSecret`, `sendEvent`).

<!-- END:skill-use-cases -->

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill google-analytics` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                           | Load                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__google-analytics__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                                     | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                            | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Google Analytics API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

<!-- BEGIN:skill-connections-note? -->

Every script uses the single `google-analytics` connection. Most take a numeric `propertyId` from `listAccountSummaries`.
<!-- END:skill-connections-note -->

<!-- BEGIN:skill-scripts-table -->

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

<!-- END:skill-scripts-table -->

<!-- BEGIN:disambiguation-and-refusals? -->

## Disambiguation & refusals

**Resolving a property by name.** Tools take a numeric `propertyId`, not a name. Resolve it with `listAccountSummaries` and count _exact_ (case-insensitive) matches on `propertySummaries[].displayName`: exactly one match → use its `propertyId` and act; two or more that tie → stop, list the candidates with their `propertyId` (and parent account), and ask which one. Never silently pick. The same rule applies to resolving a `keyEventId` / `customDimensionId` / `customMetricId` / `dataStreamId` from the matching `list*` tool.

**Unsupported operations — say so and stop; don't substitute another tool.** This connector does **not** create or delete GA4 accounts or properties, manage user access/permissions, or read Universal Analytics (UA) data — and it exposes no funnel, pivot, cohort, or audience-export reports, and no audience or calculated-metric management. If asked for one of these, say it isn't supported rather than repurposing a different tool or reporting a success you didn't perform. (For a report the flat `runReport` can't express, say so — don't fake a pivot by post-processing rows.)
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

| Reference                                                                                | When to load                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [references/google-analytics-api-gotchas.md](references/google-analytics-api-gotchas.md) | Before or while calling any tool. Covers the error envelope + recovery table, the numeric `propertyId` rule, report row limits & paging, date-range/timezone rules, string metric values and their types, `(other)`-row and thresholding caveats, dimension vs metric filters, custom-dimension/metric scopes/units/limits and the archive-only removal, key-event vs conversion terminology, and the Measurement Protocol identity, payload limits, and no-error-codes/validation behavior. |
| [references/use-as-recipe.md](references/use-as-recipe.md)                               | Loaded by a harness writing its own code against the GA4 API (can't load the tools, run the CLI, or import the package) — request patterns, response shapes, and pointers into the gotchas.                                                                                                                                                                                                                                                                                                  |

<!-- END:skill-references-table -->
