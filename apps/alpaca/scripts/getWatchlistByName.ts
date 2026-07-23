#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { watchlistSchema } from "../lib/alpaca.ts";

const inputSchema = z
  .object({
    name: z
      .string()
      .describe("Watchlist name (the human-chosen name, not the id)."),
  })
  .strict();
const outputSchema = watchlistSchema;

const definition = defineTool({
  name: "getWatchlistByName",
  title: "Get Watchlist By Name",
  description:
    "Get one watchlist by name, including its full list of asset symbols.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "alpaca",
  run: async (input, ctx) => {
    const url = new URL(
      `https://paper-api.alpaca.markets/v2/watchlists:by_name`,
    );
    if (input.name !== undefined) {
      url.searchParams.set("name", String(input.name));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca getWatchlistByName");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
