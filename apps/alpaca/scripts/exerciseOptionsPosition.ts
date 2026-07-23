#!/usr/bin/env node
import {
  ConnectorHttpError,
  defineTool,
  handleIfScriptMain,
  readResponseBody,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    symbol_or_contract_id: z
      .string()
      .describe(
        "Option symbol (OCC format) or contract id of the held position.",
      ),
  })
  .strict();
const outputSchema = z.object({
  symbol_or_contract_id: z.string(),
  exercise_requested: z.literal(true),
});

const definition = defineTool({
  name: "exerciseOptionsPosition",
  title: "Exercise Options Position",
  description:
    "Exercise a held options position by option symbol or contract id. Exercises the entire position — all outstanding shares in that contract (all-or-nothing); no request body. BETA endpoint; requests between market close and midnight ET are rejected, so call during market hours.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "alpaca",
  run: async (input, ctx) => {
    const url = `https://paper-api.alpaca.markets/v2/positions/${encodeURIComponent(input.symbol_or_contract_id)}/exercise`;
    const res = await ctx.fetch(url, {
      method: "POST",
    });
    if (!res.ok) {
      // The exercise endpoint rejects requests between market close and
      // midnight ET; surface that as an actionable hint rather than a raw
      // wire error (an agent hitting the window is likely to retry blindly).
      if (res.status === 403 || res.status === 422) {
        const respBody = await readResponseBody(res);
        throw ConnectorHttpError.fromResponseBody(res, respBody, {
          message:
            "Alpaca exerciseOptionsPosition: rejected. Exercise requests between market close and midnight ET are rejected — retry during market hours. This endpoint is BETA and exercises the entire position (all-or-nothing).",
        });
      }
      await throwIfNotOk(res, "Alpaca exerciseOptionsPosition");
    }
    return {
      symbol_or_contract_id: input.symbol_or_contract_id,
      exercise_requested: true as const,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
