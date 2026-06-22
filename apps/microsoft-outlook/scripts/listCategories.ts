#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH_BASE, outlookFetch } from "../lib/graph.ts";

const inputSchema = z.object({}).strict();

const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().optional(),
      displayName: z.string(),
      color: z
        .string()
        .describe('Preset color name, e.g. "preset0".')
        .optional(),
    }),
  ),
});

const definition = defineTool({
  name: "listCategories",
  title: "List Categories",
  description:
    "List the signed-in user's category names and colors. A discovery tool for the valid category names passed to updateMessage or createEvent — a category's color comes from the user's master list (you apply a category by its displayName). Only your own categories (no mailbox option).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-outlook",
  run: async (_input, ctx) => {
    // masterCategories is not paginated (no @odata.nextLink), so read the
    // `value` array directly instead of going through toListResult.
    const url = `${GRAPH_BASE}/me/outlook/masterCategories`;
    const res = await outlookFetch(ctx.fetch, "listCategories", url);
    const body = (await res.json()) as { value?: unknown[] };
    return { items: body.value ?? [] };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
