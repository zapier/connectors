/**
 * `@zapier-agent-tools/notion` — bundled entry point.
 *
 * The single public surface for the Notion skill. Each script's default
 * export is a callable+merged `Script` (see `@zapier/skills`'s
 * `defineTool` for the shape), so consumers can either:
 *
 *   import notion from "@zapier-agent-tools/notion";
 *   await notion.search({ query: "Q4 planning" });
 *
 * or, when only one script is needed:
 *
 *   import { search } from "@zapier-agent-tools/notion";
 *   await search({ query: "Q4 planning" });
 *
 * Both forms call the script as a function, which is shorthand for
 * `script.execute(input, process.env)` — the underlying `securitySchemes`
 * auto-discriminate against the env. Pass an explicit Fetch / Zapier
 * connection-ID / keyed bag as the second argument to override.
 *
 * The CLI counterpart lives in `./cli.ts` and is wired up via the
 * package's `bin` field — see `apps/notion/package.json`.
 */

import search from "./scripts/search.ts";
import createDatabaseItem from "./scripts/create-database-item.ts";

export { search, createDatabaseItem };

export default { search, createDatabaseItem };
