#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  items_count: z.number().int().describe("Number of locations returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        location_name: z
          .string()
          .nullable()
          .describe('Full accepted location name, e.g. "United States".')
          .optional(),
        location_code: z
          .number()
          .int()
          .nullable()
          .describe("Numeric location code (alternative to the name).")
          .optional(),
        country_iso_code: z
          .string()
          .nullable()
          .describe("ISO country code.")
          .optional(),
        available_languages: z
          .json()
          .nullable()
          .describe("Nested object — shape passes through.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Supported locations.")
    .optional(),
});

const definition = defineTool({
  name: "listLocationsAndLanguages",
  title: "List Locations And Languages",
  description:
    "List the exact location and language names DataForSEO accepts. Use to resolve a place or language to the precise string other tools need.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "dataforseo",
  run: async (_input, ctx) =>
    dataforseoLive(
      ctx.fetch,
      "/v3/dataforseo_labs/locations_and_languages",
      {},
      "DataForSEO listLocationsAndLanguages",
      { method: "GET" },
    ),
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
