#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { assetSchema } from "../lib/alpaca.ts";

const inputSchema = z
  .object({
    symbol_or_asset_id: z
      .string()
      .describe(
        "Symbol (AAPL), asset id (uuid), or CUSIP. Crypto pair like BTC/USD (the connector URL-encodes the slash).",
      ),
  })
  .strict();
const outputSchema = assetSchema;

const definition = defineTool({
  name: "getAsset",
  title: "Get Asset",
  description:
    "Get one asset by symbol, asset id, or CUSIP — check whether it is tradable, shortable, fractionable, and its exchange. Crypto pairs use BTC/USD.",
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
    const url = `https://paper-api.alpaca.markets/v2/assets/${encodeURIComponent(input.symbol_or_asset_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca getAsset");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
