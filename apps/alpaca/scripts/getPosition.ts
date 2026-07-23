#!/usr/bin/env node
import {
  ConnectorHttpError,
  defineTool,
  handleIfScriptMain,
  readResponseBody,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { positionSchema } from "../lib/alpaca.ts";

const inputSchema = z
  .object({
    symbol_or_asset_id: z
      .string()
      .describe("Symbol (AAPL) or asset id (uuid). Crypto pairs use BTC/USD."),
  })
  .strict();
const outputSchema = positionSchema;

const definition = defineTool({
  name: "getPosition",
  title: "Get Position",
  description:
    "Get one open position by symbol (e.g. AAPL) or asset id. Returns 404 when no position is held in that asset.",
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
    const url = `https://paper-api.alpaca.markets/v2/positions/${encodeURIComponent(input.symbol_or_asset_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    if (!res.ok) {
      const body = await readResponseBody(res);
      throw ConnectorHttpError.fromResponseBody(
        res,
        body,
        res.status === 404
          ? {
              message:
                "Alpaca getPosition: no open position held in that asset (404). This is a clean 'none', not a hard failure.",
            }
          : { message: "Alpaca getPosition failed" },
      );
    }
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
