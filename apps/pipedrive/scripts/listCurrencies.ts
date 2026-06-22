#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      code: z
        .string()
        .describe(
          "Currency code — the value other tools' currency fields take.",
        ),
      name: z.string().describe("Currency name."),
      symbol: z.string().describe("Currency symbol.").nullish(),
      decimal_points: z
        .number()
        .int()
        .describe("Number of decimal places.")
        .nullish(),
    }),
  ),
});

const definition = defineTool({
  name: "listCurrencies",
  title: "List Currencies",
  description:
    "List currencies supported by the account. The code is the value other tools' currency fields take.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (_input, ctx) => {
    const url = `https://api.pipedrive.com/v1/currencies`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    const wire = await readPipedrive("listCurrencies", res);
    return { items: wire.data };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
