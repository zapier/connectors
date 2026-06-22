#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForGoogleCalendar } from "../lib/google-calendar.ts";

const inputSchema = z
  .object({
    calendarId: z
      .string()
      .describe(
        'Calendar id. "primary" for the connected user\'s main calendar, or an id from listCalendars (often an email or ...@group.calendar.google.com).',
      ),
    ruleId: z
      .string()
      .describe("ACL rule id from listAclRules, e.g. user:alice@example.com."),
  })
  .strict();

const outputSchema = z
  .object({ success: z.literal(true) })
  .describe(
    "Deletion result. The API returns an empty body; success is synthesized.",
  );

const definition = defineTool({
  name: "deleteAclRule",
  title: "Delete ACL Rule",
  description:
    "Remove a sharing rule from a calendar (revoke access). Reversible — re-add the share with createAclRule. Resolve ruleId via listAclRules. Requires the owner role on the calendar.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-calendar",
  run: async (input, ctx) => {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/acl/${encodeURIComponent(input.ruleId)}`,
    );
    const res = await ctx.fetch(url.toString(), { method: "DELETE" });
    await throwForGoogleCalendar(res, "deleteAclRule");
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
