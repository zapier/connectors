#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwForStatus,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const definition = defineTool({
  name: "copyPage",
  title: "Copy a Notion page between workspaces",
  description:
    "Copy a Notion page (top-level properties only — block children are not recursed) from the `source` workspace to the `target` workspace under a chosen parent page. Returns the new page's id and url.",
  inputSchema: z.strictObject({
    sourcePageId: z
      .string()
      .describe(
        "UUID of the page to copy from the source workspace. Use the `search` tool against the source workspace to find a page by name.",
      ),
    targetParentPageId: z
      .string()
      .describe(
        "UUID of the page in the target workspace to create the copy under. Notion requires every page to have either a page or database parent.",
      ),
  }),
  outputSchema: z.object({
    object: z.literal("page"),
    id: z.string(),
    url: z.string(),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connections: { source: "notion", target: "notion" },
  run: async (input, ctx) => {
    const readRes = await ctx.connections.source(
      `https://api.notion.com/v1/pages/${input.sourcePageId}`,
      {
        method: "GET",
        headers: { "Notion-Version": "2022-06-28" },
      },
    );
    await throwForStatus(readRes, "Failed to read the source page");
    const sourcePage = (await readRes.json()) as {
      properties: Record<string, unknown>;
    };

    const createRes = await ctx.connections.target(
      "https://api.notion.com/v1/pages",
      {
        method: "POST",
        headers: {
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parent: { type: "page_id", page_id: input.targetParentPageId },
          properties: sourcePage.properties,
        }),
      },
    );
    await throwForStatus(
      createRes,
      "Failed to create the page in the target workspace",
    );
    return createRes.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, {
  connectionResolvers,
});
