---
name: perplexity
description: Agent-callable Perplexity tools — ask web-grounded questions with citations, run and poll deep research, list models, and search the web. Use when the user mentions Perplexity or wants a cited web answer or search, even if they don't name Perplexity.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/perplexity/SKILL.md
  title: Perplexity
  api-docs: https://docs.perplexity.ai
  zapier-app-key: App223919CLIAPI
---

# Perplexity

<!-- BEGIN:skill-intro -->

Agent-callable tools for Perplexity: ask a question and get a current, web-grounded answer with citations, poll a long-running research job, discover the available models, and run a ranked web search. Wraps the Perplexity Agent API and Search API (`https://api.perplexity.ai`).

<!-- legal:disclaimer -->

_Independent, unofficial connector for Perplexity. Not affiliated with, endorsed by, or sponsored by Perplexity. "Perplexity" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:skill-intro -->

## When to use this

<!-- BEGIN:skill-use-cases -->

- Answer a question with up-to-date, cited information gathered from the web.
- Run deep research as a background job and poll for the result when it's ready.
- Discover which models (including deep-research) are available to use.
- Get ranked web search results — titles, URLs, and snippets — for a query.

<!-- END:skill-use-cases -->

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill perplexity` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

Want the actual repo source instead — to browse `references/`, run this connector's tests, or hack on it? See [`README.md`](README.md#cloning-the-source) for a scoped `git clone`.

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                     | Load                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__perplexity__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                               | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                      | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Perplexity API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

<!-- BEGIN:skill-connections-note -->

All scripts share a single `perplexity` connection — one Perplexity API key.

<!-- END:skill-connections-note -->

<!-- BEGIN:skill-scripts-table -->

| Script                        | Script name        | Connections  | Description                                                                                                                                                    |
| ----------------------------- | ------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/createAgent.ts`      | `createAgent`      | `perplexity` | Ask a question and get a web-grounded, cited answer. Enable web search, pick a model or preset, request structured output, or run long jobs in the background. |
| `scripts/getAgentResponse.ts` | `getAgentResponse` | `perplexity` | Retrieve or poll an agent response by id — poll a background / deep-research run until it completes.                                                           |
| `scripts/listModels.ts`       | `listModels`       | `perplexity` | List the model ids usable with `createAgent`, including deep-research models.                                                                                  |
| `scripts/search.ts`           | `search`           | `perplexity` | Search the web and get ranked results with titles, URLs, and snippets.                                                                                         |

<!-- END:skill-scripts-table -->

<!-- BEGIN:disambiguation-and-refusals? -->

## Disambiguation & refusals

**Unsupported requests — decline, don't fake.** This connector answers questions and searches the web; it does **not** generate images, produce text embeddings, stream partial output, or run the Agent API's other tools (people or finance search, URL fetching, code sandbox). If a user asks for one of these, say plainly that it isn't supported and stop — never substitute a different tool and report success for an action you didn't perform.

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

| Reference                                                                      | Covers                                                                                                                                                                                                                                                                                                                                                                                              | Load it when                                                                                                                                         |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/perplexity-api-gotchas.md`](references/perplexity-api-gotchas.md) | Auth & API keys, error status codes (401/400/429), rate limits & usage tiers, `provider/model` ids, the Agent request shape (input, model vs preset, web search as a tool, reasoning effort), background runs and terminal statuses, structured-output schema constraints and the first-request schema-prep delay, Search API multi-query/date-filter/`max_results` rules, and grounding/citations. | Before calling any tool — to get error handling, rate-limit backoff, date-filter formats, model ids, background polling, or structured output right. |

<!-- END:skill-references-table -->
