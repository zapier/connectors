#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { runwayFetch } from "../lib/runwayFetch.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  creditBalance: z
    .number()
    .describe("Current credit balance for the organization."),
  tier: z
    .object({
      maxMonthlyCreditSpend: z
        .number()
        .nullable()
        .describe("Maximum monthly credit spend for the current tier.")
        .optional(),
      models: z
        .record(
          z.string(),
          z.object({
            maxConcurrentGenerations: z
              .number()
              .int()
              .describe("Maximum tasks of this model that can run at once.")
              .optional(),
            maxDailyGenerations: z
              .number()
              .int()
              .describe(
                "Maximum generations of this model per rolling 24 hours.",
              )
              .optional(),
          }),
        )
        .nullable()
        .describe("Per-model limits, keyed by model name.")
        .optional(),
    })
    .nullable()
    .optional(),
});

const definition = defineTool({
  name: "getOrganization",
  title: "Get Organization",
  description:
    "Read the organization's current credit balance and per-model concurrency and daily generation limits.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "runway",
  run: async (_input, ctx) => {
    const res = await runwayFetch(
      ctx.fetch,
      "/organization",
      { method: "GET" },
      "Runway getOrganization",
    );
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
