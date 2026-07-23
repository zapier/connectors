#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  is_open: z.boolean(),
  next_open: z.string().nullable().optional(),
  next_close: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "getClock",
  title: "Get Clock",
  description:
    "Get the market clock: whether the market is open now, and the next open and close times. Check before placing time-sensitive orders.",
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
    const url = `https://paper-api.alpaca.markets/v2/clock`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca getClock");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
