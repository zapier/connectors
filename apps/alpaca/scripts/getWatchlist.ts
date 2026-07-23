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
    watchlist_id: z.string().describe("Watchlist id from listWatchlists."),
  })
  .strict();
const outputSchema = watchlistSchema;

const definition = defineTool({
  name: "getWatchlist",
  title: "Get Watchlist",
  description:
    "Get one watchlist by id, including its full list of asset symbols.",
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
    const url = `https://paper-api.alpaca.markets/v2/watchlists/${encodeURIComponent(input.watchlist_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca getWatchlist");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
