import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const inputSchema = z.object({
  databaseId: z
    .string()
    .describe(
      "The UUID of the Notion database to add the row to. Use the `search` tool with `filter.value: \"database\"` to find a database by name, or call `list-databases` if your harness has it.",
    ),
  properties: z
    .record(z.string(), z.unknown())
    .describe(
      "Key/value map of property values for the new row. Keys are the database's property names (NOT API field keys — Notion's UI labels). Values follow the Notion property-value shape for the property's type (text → { rich_text: [{ text: { content }}] }, number → { number }, select → { select: { name } }, etc.). The exact property shape DEPENDS on the chosen database — see `inputDependencies` below.",
    ),
});

export const outputSchema = z.object({
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
});

/**
 * `inputDependencies` is an out-of-band named export carrying the per-field
 * dependency graph for this tool's input. Adapter consumers that understand
 * dependent fields (Sidekick, code-Zaps, dependent-field-aware harnesses) read
 * this named export at install / register time to drive option-loading and
 * schema-resolution chains. Adapter consumers that don't (vanilla MCP servers,
 * `tools/list` consumers) safely ignore it — `tool` alone is a valid MCP
 * descriptor, and the wire-form mirror in `tool._meta["zapier:inputDependencies"]`
 * makes the chain visible to any MCP consumer that opts into it.
 *
 * Shape rationale: the dependency declaration uses tool-name strings (not
 * function references like `optionsFrom(otherTool)`) so it stays serializable
 * across the wire and through MCP's `_meta` namespace. Argument values that
 * reference other input fields use the `$<fieldName>` syntax — read by the
 * adapter, not evaluated in this module.
 */
export const inputDependencies = {
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

export const tool: Tool = {
  name: "create_database_item",
  title: "Create row in a Notion database",
  description:
    "Add a new row (page) to a Notion database. The `properties` field's accepted shape depends on the chosen database's schema — see `inputDependencies` in this module, or read `_meta[\"zapier:inputDependencies\"]` on this tool over MCP wire. The database must be shared with the integration before it appears in lookups; see `references/notion-api-gotchas.md`.",
  inputSchema: z.toJSONSchema(inputSchema) as Tool["inputSchema"],
  outputSchema: z.toJSONSchema(outputSchema) as Tool["outputSchema"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  _meta: {
    "zapier:appKey": "notion",
    "zapier:actionKey": "create_database_item",
    "zapier:inputDependencies": inputDependencies,
    "zapier:statements": [
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
  },
};

/**
 * `buildDirectFetch` only handles the auth concern (Authorization header).
 * Notion's protocol headers (`Notion-Version`, `Content-Type`) are set by
 * `execute()` instead, because they're a property of the API call, not the
 * caller's auth — alternative auth wrappers like `@zapier/skills`'
 * `buildZapierFetch` shouldn't have to know they're talking to Notion to add
 * a Notion-Version header.
 */
export const buildDirectFetch =
  (token: string): typeof globalThis.fetch =>
  (url, init = {}) =>
    globalThis.fetch(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    });

export default async function execute(
  input: z.infer<typeof inputSchema>,
  fetch: typeof globalThis.fetch,
): Promise<z.infer<typeof outputSchema>> {
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
  return res.json() as Promise<z.infer<typeof outputSchema>>;
}

if ((import.meta as { main?: boolean }).main) {
  const raw =
    process.argv[2] ??
    (await new Response(process.stdin as unknown as ReadableStream).text());
  const input = inputSchema.parse(JSON.parse(raw));
  const connId = process.env.NOTION_ZAPIER_CONNECTION_ID;
  const token = process.env.NOTION_TOKEN;
  let authedFetch: typeof globalThis.fetch;
  if (connId) {
    const { buildZapierFetch } = await import("@zapier/skills");
    authedFetch = await buildZapierFetch(connId);
  } else if (token) {
    authedFetch = buildDirectFetch(token);
  } else {
    throw new Error("Set NOTION_TOKEN or NOTION_ZAPIER_CONNECTION_ID.");
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(await execute(input, authedFetch), null, 2));
}
