#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForGoogleCalendar } from "../lib/google-calendar.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z
  .object({
    event: z
      .record(
        z.string(),
        z.object({
          background: z.string().optional(),
          foreground: z.string().optional(),
        }),
      )
      .describe("Event color palette, keyed by colorId (1-11).")
      .optional(),
    calendar: z
      .record(
        z.string(),
        z.object({
          background: z.string().optional(),
          foreground: z.string().optional(),
        }),
      )
      .describe("Calendar color palette, keyed by colorId (1-24).")
      .optional(),
  })
  .describe(
    "Color palettes. Each entry maps a colorId index to background/foreground hex.",
  );

const definition = defineTool({
  name: "getColors",
  title: "Get Colors",
  description:
    "Return the event and calendar color palettes (colorId index to background/foreground hex). The resolver for any colorId input — colorId is a palette index (events 1-11), not a hex value.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-calendar",
  run: async (_input, ctx) => {
    const url = `https://www.googleapis.com/calendar/v3/colors`;
    const res = await ctx.fetch(url, { method: "GET" });
    await throwForGoogleCalendar(res, "getColors");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
