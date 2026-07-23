#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { watchlistSchema } from "../lib/alpaca.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  watchlists: z
    .array(watchlistSchema)
    .describe("The account's watchlists (list view omits assets)."),
});

const definition = defineTool({
  name: "listWatchlists",
  title: "List Watchlists",
  description:
    "List the account's watchlists (id, name, created/updated). Use getWatchlist for the symbols in one.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "alpaca",
  run: async (_input, ctx) => {
    const url = `https://paper-api.alpaca.markets/v2/watchlists`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca listWatchlists");
    return { watchlists: await res.json() };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
