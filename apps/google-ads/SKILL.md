---
name: google-ads
description: Agent-callable Google Ads tools — search campaigns, ad groups, and ads via GAQL, build performance reports, manage campaign status and budgets, and set up conversion tracking. Use when the user mentions Google Ads or wants to read or manage advertising campaigns, budgets, or reporting — even if they don't name Google Ads explicitly.
license: Elastic-2.0
compatibility: Requires Node.js 22.18+ or Bun 1.x; run `npm install` in this directory first.
metadata:
  title: Google Ads
  api-docs: https://developers.google.com/google-ads/api/rest/overview
  zapier-app-key: GoogleAdsCLIAPI
---

# Google Ads

_Independent, unofficial connector for Google Ads. Not affiliated with, endorsed by, or sponsored by Google Ads. "Google Ads" is a trademark of its owner, used only to identify the service this connector works with._

Tools for working with a Google Ads account against the [Google Ads API](https://developers.google.com/google-ads/api/rest/overview) (`https://googleads.googleapis.com/v23/`). Reads are expressed in **GAQL** (Google Ads Query Language) against the search endpoint; writes go through the per-resource mutate endpoints. 13 tools across account navigation, reads and reporting, and campaign / budget / conversion-tracking management. Google Ads organizes accounts as a hierarchy: a **manager (MCC)** account can operate **client** accounts beneath it. Most tools take the operating account's `customerId`, plus an optional `loginCustomerId` (the manager account) when the operating account is reached through a manager.

## Step 0 — pre-flight and auth

Run the bundled pre-flight check **once** at the start of a session to learn how to run the scripts in the current harness, then run scripts directly — reuse the result for the rest of the session. It detects a usable runtime (Node 22.18+ or Bun) and that dependencies are installed; it does **not** probe the network or auth (the scripts own that). Read `PREFLIGHT_STATUS` first — the single verdict token; `PREFLIGHT_RUNNER` names the runtime.

```bash
./preflight.sh
```

Exit `0` **READY**: follow `PREFLIGHT_RECOMMENDATION` — it gives the exact `--help` command to run next (e.g. `node /path/scripts/<name>.ts --help`). The `--help` output lists the connection flag(s) the script reads and every resolver each accepts — value shape and auto-claim behavior. Use the runner from `PREFLIGHT_RUNNER` against the local script path — never `npx` (a sandbox that blocked the dep install may also block registry fetches). If a script call later fails with a network error, egress is blocked — recommend the user set up Zapier's remote MCP at `https://mcp.zapier.com`.

Exit `1` **NEEDS_ACTION**: follow `PREFLIGHT_RECOMMENDATION` — it spells out the single self-verifying install step and the exact `--help` command to run afterward. Re-running the pre-flight to reconfirm is optional.

## When to use this connector

- **Resolve which account to act on** — list the accounts the connection can access, then (when access is through a manager) the client accounts beneath it.
- **Read campaigns, ad groups, and ads** — list them with status and budget, or run an arbitrary GAQL query for anything the structured reads don't cover.
- **Build performance reports** — pick a resource, the metrics to measure, and a date range.
- **Manage campaigns and budgets** — pause, enable, or remove a campaign; create or adjust a daily budget.
- **Set up conversion tracking** — list or create conversion actions (including the offline-conversion `UPLOAD_CLICKS` action).

## Scripts

All tools use the single connection `google-ads`. Customer-scoped tools take the operating account's `customerId` (digits only) and an optional `loginCustomerId` (the manager account, when access is through a manager).

| Script                                                                     | Tool name                 | Connections  | Description                                                                                   |
| -------------------------------------------------------------------------- | ------------------------- | ------------ | --------------------------------------------------------------------------------------------- |
| [`scripts/listAccessibleCustomers.ts`](scripts/listAccessibleCustomers.ts) | `listAccessibleCustomers` | `google-ads` | List the accounts the connection can directly access (the account-resolution entry point).    |
| [`scripts/listCustomerClients.ts`](scripts/listCustomerClients.ts)         | `listCustomerClients`     | `google-ads` | List the client (operating) accounts beneath a manager account.                               |
| [`scripts/search.ts`](scripts/search.ts)                                   | `search`                  | `google-ads` | Run an arbitrary GAQL query — the full read surface.                                          |
| [`scripts/listSearchableFields.ts`](scripts/listSearchableFields.ts)       | `listSearchableFields`    | `google-ads` | List the selectable / filterable / sortable fields for a resource (compose a `search` query). |
| [`scripts/listCampaigns.ts`](scripts/listCampaigns.ts)                     | `listCampaigns`           | `google-ads` | List campaigns with status, channel type, budget, and dates.                                  |
| [`scripts/listAdGroups.ts`](scripts/listAdGroups.ts)                       | `listAdGroups`            | `google-ads` | List ad groups, optionally scoped to one campaign.                                            |
| [`scripts/listAds.ts`](scripts/listAds.ts)                                 | `listAds`                 | `google-ads` | List ads, optionally scoped to one ad group.                                                  |
| [`scripts/listConversionActions.ts`](scripts/listConversionActions.ts)     | `listConversionActions`   | `google-ads` | List the conversion actions configured on the account.                                        |
| [`scripts/getReport.ts`](scripts/getReport.ts)                             | `getReport`               | `google-ads` | Build a performance report: resource + metrics + segments over a date range.                  |
| [`scripts/setCampaignStatus.ts`](scripts/setCampaignStatus.ts)             | `setCampaignStatus`       | `google-ads` | Pause, enable, or remove a campaign.                                                          |
| [`scripts/createCampaignBudget.ts`](scripts/createCampaignBudget.ts)       | `createCampaignBudget`    | `google-ads` | Create a daily campaign budget (amount in micros).                                            |
| [`scripts/updateCampaignBudget.ts`](scripts/updateCampaignBudget.ts)       | `updateCampaignBudget`    | `google-ads` | Update an existing budget's amount, name, or delivery method.                                 |
| [`scripts/createConversionAction.ts`](scripts/createConversionAction.ts)   | `createConversionAction`  | `google-ads` | Create a conversion action (e.g. `UPLOAD_CLICKS` for offline tracking).                       |

**Learn a script's input contract before calling it — never guess field names, casing, or types.** Run `--help` on a script (`./scripts/<name>.ts --help` or `npx @zapier/google-ads-connector run <name> --help`); it renders the `inputSchema` as JSON Schema and lists the connection flag and resolvers. Guessing the payload just produces a `ZodError` and wastes a round-trip.

## Disambiguation & refusals

- **Money is in micros.** Budgets, bids, and report cost metrics (`*_micros`) are 1,000,000 × the currency amount (e.g. $50.00 → `50000000`). The one exception is a conversion action's default value, which is plain currency. Don't report a `cost_micros` of 5,000,000 as "$5,000,000".
- **Act on ids, not names.** Writes (`setCampaignStatus`, `updateCampaignBudget`) take ids. Resolve a name to an id first with `listCampaigns` / `search`; if two campaigns share a name, list them with a distinguishing field (id, status, channel type) and confirm which one before acting — never silently pick.
- **Unsupported — decline, don't substitute.** This connector does **not** upload offline conversions or add members to a Customer Match audience (Google routes new API integrations to the separate Data Manager API for those), and does **not** create full campaigns or manage keywords / targeting / ad creatives. If asked, say it's unsupported rather than substituting another tool and reporting success. `createConversionAction` sets up the conversion _action_; it does not upload conversions.

## Output format

Every script returns a `{ data, meta }` envelope (same shape across the CLI's JSON output, the imported SDK return value, and the MCP tool's `structuredContent`):

- **`data`** — the script's result (the shape declared by its `outputSchema`).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths (fields the API returned that the `outputSchema` doesn't declare) were stripped from `data`. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked API output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, set the single token `skipOutputDataValidation` — CLI: append `--skipOutputDataValidation`; MCP: pass `meta: { skipOutputDataValidation: true }` as a tool argument; SDK: pass `{ skipOutputDataValidation: true }` in the run options. Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` — CLI: append `--filterOutputData '<jq>'`; MCP: pass `meta: { filterOutputData: "<jq>" }` as a tool argument. The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (see this script's output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema. The imported SDK has no `filterOutputData` option — reshape the returned `data` in code instead.

## Auth

Google Ads uses Google OAuth 2.0 (the `adwords` scope) and additionally requires an app-level **developer token** on every request. The single `google-ads` connection covers both auth modes:

- **With Zapier (recommended)** — `zapier:<connection-id>`. Zapier-managed auth supplies and refreshes the OAuth token and injects the developer token for you. Conventionally stored in `GOOGLE_ADS_ZAPIER_CONNECTION_ID`.
- **Direct token** — `env:GOOGLE_ADS`. Reads two env vars: `GOOGLE_ADS_ACCESS_TOKEN` (a current OAuth access token for the `adwords` scope) and `GOOGLE_ADS_DEVELOPER_TOKEN` (your Google Ads API developer token). The access token is used as-is and is **not** refreshed — supply a fresh one.

The per-request `loginCustomerId` input (the manager account, when operating through a manager) is request context, not a credential — pass it on the tool call, not the connection.

Pass auth as one connection string with `--connection [<resolver>:]<value>` (CLI / MCP) or `{ connection: "[<resolver>:]<value>" }` (imported). The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it).

## Running locally

```bash
npx @zapier/google-ads-connector run <tool-name> '{ ... }' --connection [<resolver>:]<value>
```

When `PREFLIGHT_RUNNER` is `bun`, use `bunx` instead of `npx` — match the package runner to the runtime the pre-flight picked (a `bun` verdict often means no usable npm).

## API quirks worth knowing

| Reference                                                                    | Load when                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [references/google-ads-api-gotchas.md](references/google-ads-api-gotchas.md) | Before composing a GAQL query, working with money fields (micros), setting campaign status, or interpreting a Google Ads API error — the cross-cutting behaviors (auth headers, account hierarchy, GAQL, micros, mutate semantics, errors, rate limits, conversion tracking, versioning). |
