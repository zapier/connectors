#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z.string().describe("Index to configure. From listIndices."),
    settings: z
      .record(z.string(), z.any())
      .describe(
        "Settings to set, e.g. { searchableAttributes, attributesForFaceting, customRanking, replicas }.",
      ),
    forwardToReplicas: z
      .boolean()
      .describe(
        "Apply the change to the index's replicas too. Default false (primary only); replicas must already exist.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  taskID: z
    .number()
    .int()
    .describe("Async task id — poll getTask until published."),
  updatedAt: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "setSettings",
  title: "Set Settings",
  description:
    "Update an index's settings (relevance, faceting, ranking, replicas). Merged with existing settings — only supplied keys change. Configure attributesForFaceting here before filtering.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "algolia",
  run: async (input, ctx) => {
    const url = new URL(
      `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/settings`,
    );
    if (input.forwardToReplicas !== undefined) {
      url.searchParams.set(
        "forwardToReplicas",
        String(input.forwardToReplicas),
      );
    }
    const body: Record<string, unknown> = {};
    if (input.settings !== undefined) body["settings"] = input.settings;
    const res = await ctx.fetch(url.toString(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body.settings),
    });
    await ensureAlgoliaOk(res, "setSettings");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
