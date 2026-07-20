# @zapier/google-analytics-connector

_Independent, unofficial connector for Google Analytics. Not affiliated with, endorsed by, or sponsored by Google Analytics. "Google Analytics" is a trademark of its owner, used only to identify the service this connector works with._

`@zapier/google-analytics-connector` wraps [Google Analytics 4](https://developers.google.com/analytics/devguides/reporting/data/v1) (GA4) as agent-callable tools across its three surfaces — the Data API (reporting), the Admin API (configuration), and the Measurement Protocol (sending events). It runs analytics reports, discovers the dimensions and metrics a property supports, navigates the account → property tree, manages key events (conversions) and custom dimensions/metrics, and sends server-side events. Auth is Google OAuth 2.0 (a bearer access token), either Zapier-managed or a direct token; `sendEvent` additionally takes a per-stream Measurement Protocol secret.

## When to use this

- Pull GA4 reporting data — traffic, conversions, engagement — into an agent workflow, historical or realtime, without hand-writing the Data API request.
- Discover valid dimension/metric names (`getMetadata`) and check field compatibility (`checkCompatibility`) before running a report.
- Manage the GA4 configuration an agent can reasonably own: key events (conversions) and custom dimensions/metrics.
- Send server-side events via the Measurement Protocol (`sendEvent`).

## When NOT to use this

- **Universal Analytics (UA)** — fully sunset; this connector is GA4-only and does not read UA data or `UA-XXXXXXX-Y` tracking ids.
- **Account/property lifecycle** (creating or deleting accounts/properties) or **user-access/permission management** — out of scope; use the Google Analytics Admin console.
- **Funnel, pivot, cohort, or audience-export reports**, and **audience/calculated-metric management** — not exposed (this connector tracks the stable v1beta surface).

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export GOOGLE_ANALYTICS_ACCESS_TOKEN=xxx
npx @zapier/google-analytics-connector@latest run <script> '<input-json>' --connection env:GOOGLE_ANALYTICS_ACCESS_TOKEN

# Install as a dependency to import the functions in your own code
npm install @zapier/google-analytics-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill google-analytics
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection`. The value is a _selector_, not the secret: `--connection zapier:<connection-id>` routes through Zapier-managed auth (recommended; no third-party secret enters the agent's environment, and the connection id isn't itself a secret so you can pass it as-is), and `--connection env:GOOGLE_ANALYTICS_ACCESS_TOKEN` reads a direct token from `$GOOGLE_ANALYTICS_ACCESS_TOKEN` (the token stays in `env`, never on argv). The `<resolver>:` prefix is optional — a bare value is claimed by the first matching resolver. See [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "google-analytics": {
      "command": "npx",
      "args": ["@zapier/google-analytics-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:GOOGLE_ANALYTICS_ACCESS_TOKEN"` with `"env": { "GOOGLE_ANALYTICS_ACCESS_TOKEN": "xxx" }`) to `args` to set a default.

## Scripts

**Reporting (Data API)**

| Script               | Description                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `runReport`          | Run a GA4 report — dimensions + metrics over date ranges, optionally filtered/sorted. The core analytics tool. |
| `runRealtimeReport`  | Run a realtime report over roughly the last 30 minutes of activity.                                            |
| `getMetadata`        | List the dimensions and metrics a property supports. Call before `runReport`.                                  |
| `checkCompatibility` | Check whether a set of dimensions and metrics can be combined in one report.                                   |

**Navigation (Admin API)**

| Script                 | Description                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `listAccountSummaries` | List accessible accounts with their properties. The entry point for resolving `propertyId`. |
| `getProperty`          | Get a property's config — display name, currency, timezone, industry category.              |
| `listDataStreams`      | List a property's data streams; web streams carry the `G-` measurement id.                  |

**Key events (conversions)**

| Script           | Description                                             |
| ---------------- | ------------------------------------------------------- |
| `listKeyEvents`  | List a property's key events.                           |
| `getKeyEvent`    | Get one key event by id.                                |
| `createKeyEvent` | Mark an event name as a key event (conversion).         |
| `deleteKeyEvent` | Delete a key event (only user-created, deletable ones). |

**Custom definitions**

| Script                   | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| `listCustomDimensions`   | List a property's custom dimensions.                           |
| `createCustomDimension`  | Create a custom dimension on an event/user parameter.          |
| `archiveCustomDimension` | Archive a custom dimension, freeing its slot (no hard delete). |
| `listCustomMetrics`      | List a property's custom metrics.                              |
| `createCustomMetric`     | Create a custom metric on a numeric event parameter.           |
| `archiveCustomMetric`    | Archive a custom metric, freeing its slot (no hard delete).    |

**Measurement Protocol**

| Script                            | Description                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `listMeasurementProtocolSecrets`  | List a data stream's Measurement Protocol secrets, including their values.                 |
| `createMeasurementProtocolSecret` | Create a Measurement Protocol secret on a data stream.                                     |
| `sendEvent`                       | Send events to GA4 via the Measurement Protocol (authenticates with a stream `apiSecret`). |

Run `npx @zapier/google-analytics-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:GOOGLE_ANALYTICS_ACCESS_TOKEN" }`.

```ts
import { runReport } from "@zapier/google-analytics-connector";

const { data } = await runReport(
  {
    propertyId: "123456",
    dimensions: [{ name: "country" }],
    metrics: [{ name: "activeUsers" }],
    dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }],
  },
  { connection: "env:GOOGLE_ANALYTICS_ACCESS_TOKEN" },
);
// data.rows -> [{ dimensionValues: [{ value: "United States" }], metricValues: [{ value: "1234" }] }, ...]
```

## Auth

Already have a connection value? Pass it as shown above — `--connection` for the CLI/MCP shapes, `{ connection }` for imported functions. No connection yet? Pick one:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/google-analytics)
- [Google Analytics Data API (v1)](https://developers.google.com/analytics/devguides/reporting/data/v1) and [Admin API (v1)](https://developers.google.com/analytics/devguides/config/admin/v1) — vendor API docs

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Google Analytics's API, services, data, schemas, documentation, or other materials, which remain the property of Google Analytics. Your use of Google Analytics's API is governed by your own agreement with Google Analytics.

**Trademarks and affiliation.** Google Analytics and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Google Analytics.

**Your responsibility.** This connector calls Google Analytics's API using credentials you supply. You are responsible for holding a valid Google Analytics account, for complying with Google Analytics's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Google Analytics product. Zapier is not responsible for changes Google Analytics makes to its API or for any consequence of your use of Google Analytics's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
