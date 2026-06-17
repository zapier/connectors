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
    role: z
      .enum(["freeBusyReader", "reader", "writer", "owner"])
      .describe("Access level to grant."),
    scope: z
      .strictObject({
        type: z
          .enum(["user", "group", "domain", "default"])
          .describe(
            'Scope type. "default" = the public; otherwise value is required.',
          ),
        value: z
          .string()
          .describe(
            "The email (user/group) or domain the rule applies to. Omit for type=default.",
          )
          .optional(),
      })
      .describe("Who the sharing rule applies to."),
    sendNotifications: z
      .boolean()
      .describe("Whether to email the grantee about the new sharing.")
      .optional(),
  })
  .strict();

const outputSchema = z
  .object({
    id: z
      .string()
      .describe(
        "Rule id, e.g. user:alice@example.com (use as ruleId for deleteAclRule).",
      ),
    role: z.enum(["none", "freeBusyReader", "reader", "writer", "owner"]),
    scope: z
      .object({
        type: z
          .enum(["user", "group", "domain", "default"])
          .describe(
            'Scope type. "default" = the public; otherwise value is the email/domain.',
          ),
        value: z
          .string()
          .describe("The email (user/group) or domain the rule applies to.")
          .optional(),
      })
      .describe("Who the sharing rule applies to."),
  })
  .describe("A calendar sharing rule.");

const definition = defineTool({
  name: "createAclRule",
  title: "Create ACL Rule",
  description:
    "Share a calendar with a user, group, or domain at a given role. Requires the owner role on the calendar.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-calendar",
  run: async (input, ctx) => {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/acl`,
    );
    if (input.sendNotifications !== undefined)
      url.searchParams.set(
        "sendNotifications",
        String(input.sendNotifications),
      );

    const body = { role: input.role, scope: input.scope };
    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwForGoogleCalendar(res, "createAclRule");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
