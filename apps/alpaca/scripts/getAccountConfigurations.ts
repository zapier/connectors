#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { accountConfigSchema } from "../lib/alpaca.ts";

const inputSchema = z.object({}).strict();
const outputSchema = accountConfigSchema;

const definition = defineTool({
  name: "getAccountConfigurations",
  title: "Get Account Configurations",
  description:
    "Get the account's trading configuration flags (shorting, day-trade suspension, fractional trading, options level, email confirmations).",
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
    const url = `https://paper-api.alpaca.markets/v2/account/configurations`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca getAccountConfigurations");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
