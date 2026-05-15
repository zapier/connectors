import { z } from "zod";
import { defineTool, runCli, type BuildFetch } from "@zapier/skills";

/**
 * Out-of-band per-script dependency graph for `create-database-item`'s input.
 *
 * Adapter consumers that understand dependent fields (Sidekick, code-Zaps,
 * dependent-field-aware harnesses) read this descriptor at install /
 * register time to drive option-loading and schema-resolution chains. The
 * descriptor is published in two places by `defineTool`:
 *
 *   1. `script.inputDependencies` — programmatic readers reach for it
 *      directly off the script's default export.
 *   2. `script.tool._meta["zapier:inputDependencies"]` — adapters that only
 *      see the MCP `Tool` over the wire find the same chain there.
 *
 * Adapter consumers that don't understand dependent fields (vanilla MCP
 * servers, `tools/list` consumers) safely ignore both surfaces — the
 * `Tool` descriptor itself is still standards-compliant.
 *
 * Shape rationale: dependencies use tool-name strings (not function
 * references like `optionsFrom(otherTool)`) so the chain stays serializable
 * across the wire and through MCP's `_meta` namespace. Argument values that
 * reference other input fields use `$<fieldName>` syntax — read by the
 * adapter, not evaluated in this module.
 */
const inputDependencies = {
  databaseId: {
    kind: "options",
    fromTool: "list-databases",
    fromArgs: {},
  },
  properties: {
    kind: "schema",
    fromTool: "get-database-schema",
    fromArgs: { databaseId: "$databaseId" },
  },
} as const;

/**
 * `buildFetch` only handles the auth concern (Authorization header).
 * Notion's protocol headers (`Notion-Version`, `Content-Type`) are set by
 * `execute()` instead, because they're a property of the API call, not the
 * caller's auth — alternative auth wrappers like the synthesized Zapier
 * scheme shouldn't have to know they're talking to Notion to add a
 * Notion-Version header. Referenced by the `apiKey` security scheme below.
 */
const buildFetch: BuildFetch<{ NOTION_TOKEN: string }> =
  ({ NOTION_TOKEN }) =>
  (url, init = {}) =>
    globalThis.fetch(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${NOTION_TOKEN}`,
      },
    });

const script = defineTool({
  appKey: "notion",
  name: "create_database_item",
  title: "Create row in a Notion database",
  description:
    "Add a new row (page) to a Notion database. The `properties` field's accepted shape depends on the chosen database's schema — see `inputDependencies` on this script, or read `_meta[\"zapier:inputDependencies\"]` on this tool over MCP wire. The database must be shared with the integration before it appears in lookups; see `references/notion-api-gotchas.md`.",
  inputSchema: z.object({
    databaseId: z
      .string()
      .describe(
        'The UUID of the Notion database to add the row to. Use the `search` tool with `filter.value: "database"` to find a database by name, or call `list-databases` if your harness has it.',
      ),
    properties: z
      .record(z.string(), z.unknown())
      .describe(
        "Key/value map of property values for the new row. Keys are the database's property names (NOT API field keys — Notion's UI labels). Values follow the Notion property-value shape for the property's type (text → { rich_text: [{ text: { content }}] }, number → { number }, select → { select: { name } }, etc.). The exact property shape DEPENDS on the chosen database — see `inputDependencies` below.",
      ),
  }),
  outputSchema: z.object({
    object: z.literal("page"),
    id: z.string(),
    created_time: z.string(),
    last_edited_time: z.string(),
    parent: z.object({
      type: z.literal("database_id"),
      database_id: z.string(),
    }),
    properties: z.record(z.string(), z.unknown()),
    url: z.string(),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  statements: [
    {
      effect: "ask",
      permissions: ["can_execute"],
      resources: ["http"],
      conditions: [
        { path: ["method"], operator: "equals", value: "POST" },
        {
          path: ["url"],
          operator: "matches_url",
          value: "https://api.notion.com/v1/pages",
        },
      ],
      label: "Create a new row in a Notion database",
    },
  ],
  inputDependencies,
  securitySchemes: {
    apiKey: { env: ["NOTION_TOKEN"], buildFetch },
  },
  execute: async (input, fetch) => {
    const body = {
      parent: { type: "database_id" as const, database_id: input.databaseId },
      properties: input.properties,
    };
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Notion create_database_item ${res.status}: ${errBody}`);
    }
    return res.json() as Promise<{
      object: "page";
      id: string;
      created_time: string;
      last_edited_time: string;
      parent: { type: "database_id"; database_id: string };
      properties: Record<string, unknown>;
      url: string;
    }>;
  },
});

export default script;

await runCli(import.meta, script);
