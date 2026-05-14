import { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const inputSchema = z.object({
  query: z.string().describe(
    "The text query to search for in the user's Notion workspace. Searches both page titles and database titles.",
  ),
  filter: z
    .object({
      property: z.literal("object"),
      value: z.enum(["page", "database"]),
    })
    .optional()
    .describe(
      "Optional filter to limit results to either pages or databases. Omit to search both.",
    ),
  page_size: z.number().int().min(1).max(100).optional(),
  start_cursor: z.string().optional(),
});

export const outputSchema = z.object({
  results: z.array(z.unknown()),
  next_cursor: z.string().nullable().optional(),
  has_more: z.boolean().optional(),
});

export const tool: Tool = {
  name: "search",
  title: "Search Notion",
  description:
    "Search Notion pages and databases by query string. Returns matching items with metadata (id, title, parent, url, last_edited_time).",
  inputSchema: z.toJSONSchema(inputSchema) as Tool["inputSchema"],
  outputSchema: z.toJSONSchema(outputSchema) as Tool["outputSchema"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  _meta: {
    "zapier:appKey": "notion",
    "zapier:actionKey": "search",
    "zapier:statements": [
      {
        effect: "allow",
        permissions: ["can_execute"],
        resources: ["http"],
        conditions: [
          { path: ["method"], operator: "equals", value: "POST" },
          {
            path: ["url"],
            operator: "matches_url",
            value: "https://api.notion.com/v1/search",
          },
        ],
        label: "Search the connected Notion workspace",
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
  const res = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Notion search ${res.status}: ${errBody}`);
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
