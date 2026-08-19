# @zapier/perplexity-connector

<!-- BEGIN:readme-intro -->

Agent-callable tools for [Perplexity](https://docs.perplexity.ai). Ask a question and get a current, web-grounded answer with citations; run and poll long deep-research jobs; list the available models; and run a ranked web search. Wraps the Perplexity Agent API (`POST /v1/agent`) and Search API (`POST /search`) at `https://api.perplexity.ai`, authenticated with a single Perplexity API key.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Perplexity. Not affiliated with, endorsed by, or sponsored by Perplexity. "Perplexity" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:readme-intro -->

## When to use this

<!-- BEGIN:readme-when-to-use -->

Use this when you want a **current, web-grounded answer with citations** to a question, or the **ranked source pages** for a query. It's a good fit for research questions that need up-to-date information from the web, long-running deep research (submitted as a background job and polled), and getting structured (JSON-schema) output from a grounded answer.
<!-- END:readme-when-to-use -->

## When NOT to use this

<!-- BEGIN:readme-when-not-to-use -->

- **Raw LLM chat completions** without web grounding, or routing to arbitrary third-party models — use a general LLM/provider connector instead.
- **The Agent API's other tools** (people search, finance search, URL fetching, code sandbox) and **text embeddings** — not covered here.
- **Streaming** token-by-token output — this connector returns the complete answer (long jobs use the background + poll flow).

<!-- END:readme-when-not-to-use -->

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/perplexity-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/perplexity-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill perplexity
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection` — a _selector_, not the secret. The `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver. See [Auth](#auth) below for the with/without-Zapier tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "perplexity": {
      "command": "npx",
      "args": ["@zapier/perplexity-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

### Cloning the source

You don't need to clone anything to use this connector — the options above already cover that. Want the actual repo source instead, to read the script code, browse `references/`, run this connector's tests, or hack on it? Clone with a path filter so you only fetch this one connector, not the whole catalog:

```bash
git clone --filter=blob:none --sparse https://github.com/zapier/connectors.git
cd connectors && git sparse-checkout set apps/perplexity
cd apps/perplexity && npm install
```

See the [main README](https://github.com/zapier/connectors#cloning-the-source) to clone several connectors at once.

## Scripts

<!-- BEGIN:readme-scripts-table -->

| Script             | Description                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createAgent`      | Ask a question and get a web-grounded, cited answer. Enable web search, pick a model or preset, request structured output, or run long jobs in the background. |
| `getAgentResponse` | Retrieve or poll an agent response by id — poll a background / deep-research run until it completes.                                                           |
| `listModels`       | List the model ids usable with `createAgent`, including deep-research models.                                                                                  |
| `search`           | Search the web and get ranked results with titles, URLs, and snippets.                                                                                         |

<!-- END:readme-scripts-table -->

Run `npx @zapier/perplexity-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

<!-- BEGIN:readme-usage-example -->

```ts
import { createAgent } from "@zapier/perplexity-connector";

const { data } = await createAgent(
  { input: "What did the latest IPCC report say about sea-level rise?" },
  { connection: "env:PERPLEXITY_API_KEY" },
);
console.log(data.answer, data.sources);
```

Every function returns a `{ data, meta }` envelope (`meta.outputDataValidation` reports any fields stripped against the output schema). Pass `{ skipOutputDataValidation: true }` in the options to receive the raw, unvalidated result. See [`SKILL.md`](SKILL.md#output-format) for the full contract.
<!-- END:readme-usage-example -->

## Auth

Already have a connection value? Pass it as shown above — `--connection` for the CLI/MCP shapes, `{ connection }` for imported functions. No connection yet? Pick one:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/perplexity)

<!-- BEGIN:readme-links-extra -->

- [Perplexity API docs](https://docs.perplexity.ai)

<!-- END:readme-links-extra -->

<!-- BEGIN:readme-footer? -->
<!-- legal:footer -->

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Perplexity's API, services, data, schemas, documentation, or other materials, which remain the property of Perplexity. Your use of Perplexity's API is governed by your own agreement with Perplexity.

**Trademarks and affiliation.** Perplexity and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Perplexity.

**Your responsibility.** This connector calls Perplexity's API using credentials you supply. You are responsible for holding a valid Perplexity account, for complying with Perplexity's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Perplexity product. Zapier is not responsible for changes Perplexity makes to its API or for any consequence of your use of Perplexity's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
<!-- /legal:footer -->
<!-- END:readme-footer -->
