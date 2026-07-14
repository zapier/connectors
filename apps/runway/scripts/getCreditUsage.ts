#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { runwayFetch } from "../lib/runwayFetch.ts";

const inputSchema = z
  .object({
    startDate: z
      .string()
      .date()
      .describe(
        "Start of the usage window (UTC, YYYY-MM-DD). Defaults to 30 days ago.",
      )
      .optional(),
    beforeDate: z
      .string()
      .date()
      .describe(
        "Exclusive end of the window (UTC, YYYY-MM-DD). Defaults to startDate + 30 days; at most startDate + 90 days.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  results: z.array(
    z.object({
      date: z.string().date().describe("The usage day (YYYY-MM-DD)."),
      usedCredits: z
        .array(
          z.object({
            model: z.string().describe("The model the credits were spent on."),
            amount: z
              .number()
              .describe(
                "Credits spent on this model that day; may be negative for refunds.",
              ),
          }),
        )
        .describe("Per-model credit spend for this day.")
        .optional(),
    }),
  ),
  models: z
    .array(z.string())
    .nullable()
    .describe("Model variants observed in the window.")
    .optional(),
});

const definition = defineTool({
  name: "getCreditUsage",
  title: "Get Credit Usage",
  description:
    "Retrieve per-day, per-model credit usage over a date range. Defaults to the last 30 days when no range is given.",
  inputSchema,
  outputSchema,
  annotations: {
    // A read despite being a POST (the date range rides in the body).
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "runway",
  run: async (input, ctx) => {
    const body: Record<string, unknown> = {};
    if (input.startDate !== undefined) body.startDate = input.startDate;
    if (input.beforeDate !== undefined) body.beforeDate = input.beforeDate;
    const res = await runwayFetch(
      ctx.fetch,
      "/organization/usage",
      { method: "POST", body: JSON.stringify(body) },
      "Runway getCreditUsage",
    );
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
