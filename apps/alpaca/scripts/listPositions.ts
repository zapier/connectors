#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { positionSchema } from "../lib/alpaca.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  positions: z.array(positionSchema).describe("Open positions."),
});

const definition = defineTool({
  name: "listPositions",
  title: "List Positions",
  description:
    'List all open positions with quantity, market value, cost basis, and unrealized profit/loss. The "what do I hold" tool.',
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
    const url = `https://paper-api.alpaca.markets/v2/positions`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca listPositions");
    return { positions: await res.json() };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
