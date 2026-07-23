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
    status: z.enum(["active", "inactive"]).optional(),
    asset_class: z
      .enum(["us_equity", "us_option", "crypto"])
      .describe("Defaults to us_equity at the API.")
      .optional(),
    exchange: z.string().optional(),
  })
  .strict();
const outputSchema = z.object({
  assets: z.array(assetSchema).describe("Matching assets."),
});

const definition = defineTool({
  name: "listAssets",
  title: "List Assets",
  description:
    "List tradable assets, filtered by asset_class, status, or exchange. The result can be very large — always pass filters; there is no pagination.",
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
    const url = new URL(`https://paper-api.alpaca.markets/v2/assets`);
    if (input.status !== undefined) {
      url.searchParams.set("status", String(input.status));
    }
    if (input.asset_class !== undefined) {
      url.searchParams.set("asset_class", String(input.asset_class));
    }
    if (input.exchange !== undefined) {
      url.searchParams.set("exchange", String(input.exchange));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Alpaca listAssets");
    return { assets: await res.json() };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
