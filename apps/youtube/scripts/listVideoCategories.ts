#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForYouTube, VideoCategorySchema } from "../lib/youtube.ts";

const inputSchema = z
  .object({
    part: z
      .string()
      .describe("Resource parts to return. Leave as the default.")
      .default("snippet"),
    regionCode: z
      .string()
      .describe(
        "ISO 3166-1 alpha-2 country code whose category set to return (e.g. US, GB). Categories vary by region.",
      )
      .default("US"),
  })
  .strict();
const outputSchema = z.object({
  items: z
    .array(VideoCategorySchema)
    .describe("The categories for the region."),
});

const definition = defineTool({
  name: "listVideoCategories",
  title: "List Video Categories",
  description:
    "List the assignable video categories for a region (the id/title pairs that categoryId accepts on a video). Resolver for the category an upload or update should use.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "youtube",
  run: async (input, ctx) => {
    const url = new URL(
      `https://www.googleapis.com/youtube/v3/videoCategories`,
    );
    if (input.part !== undefined) {
      url.searchParams.set("part", String(input.part));
    }
    if (input.regionCode !== undefined) {
      url.searchParams.set("regionCode", String(input.regionCode));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwForYouTube(res, "listVideoCategories");
    const payload = (await res.json()) as { items?: unknown };
    return { items: payload.items ?? [] };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
