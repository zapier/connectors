import {
  type BuildFetch,
  defineTool,
  handleIfScriptMain,
} from "@zapier/connectors-sdk";
import { z } from "zod";

const definition = defineTool({
  name: "create_database_item",
  title: "Create row in a Notion database",
  description:
    "Add a new row (page) to a Notion database. The `properties` field's accepted shape depends on the chosen database's schema. The database must be shared with the integration before it appears in lookups; see `references/notion-api-gotchas.md`.",
  inputSchema: z.object({
    databaseId: z
      .string()
      .describe(
        'The UUID of the Notion database to add the row to. Use the `search` tool with `filter.value: "database"` to find a database by name, or call `list-databases` if your harness has it.',
      ),
    properties: z
      .record(z.string(), z.unknown())
      .describe(
        "Key/value map of property values for the new row. Keys are the database's property names (NOT API field keys — Notion's UI labels). Values follow the Notion property-value shape for the property's type (text → { rich_text: [{ text: { content }}] }, number → { number }, select → { select: { name } }, etc.). The exact property shape depends on the chosen database's schema.",
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
  inputDependencies: {
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
  } as const,
  connection: {
    zapier: "notion",
    securitySchemes: {
      apiKey: {
        env: ["NOTION_TOKEN"],
        buildFetch: (({ NOTION_TOKEN }) =>
          (url, init = {}) =>
            globalThis.fetch(url, {
              ...init,
              headers: {
                ...(init?.headers ?? {}),
                Authorization: `Bearer ${NOTION_TOKEN}`,
              },
            })) satisfies BuildFetch<{ NOTION_TOKEN: string }>,
      },
    },
  },
  run: async (input, ctx) => {
    const body = {
      parent: { type: "database_id" as const, database_id: input.databaseId },
      properties: input.properties,
    };
    const res = await ctx.fetch("https://api.notion.com/v1/pages", {
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

export default definition;

await handleIfScriptMain(import.meta, definition);
