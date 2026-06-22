#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForGoogleCalendar } from "../lib/google-calendar.ts";

const AclScopeSchema = z
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
  .describe("Who a sharing rule applies to.");

const AclRuleSchema = z
  .object({
    id: z
      .string()
      .describe(
        "Rule id, e.g. user:alice@example.com (use as ruleId for deleteAclRule).",
      ),
    role: z.enum(["none", "freeBusyReader", "reader", "writer", "owner"]),
    scope: AclScopeSchema,
  })
  .describe("A calendar sharing rule.");

const inputSchema = z
  .object({
    calendarId: z
      .string()
      .describe(
        'Calendar id. "primary" for the connected user\'s main calendar, or an id from listCalendars (often an email or ...@group.calendar.google.com).',
      ),
    maxResults: z
      .number()
      .int()
      .gte(1)
      .lte(250)
      .describe(
        "Max rules to return per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    pageToken: z
      .string()
      .describe(
        "Page cursor from a previous response's next_page_token. Omit for the first page.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z
  .object({
    rules: z.array(AclRuleSchema),
    next_page_token: z
      .string()
      .describe(
        "Cursor for the next page; absent when there are no more results.",
      )
      .optional(),
  })
  .describe("A page of calendar sharing rules.");

const definition = defineTool({
  name: "listAclRules",
  title: "List ACL Rules",
  description:
    "List the sharing rules (access-control entries) on a calendar. Each rule's id (e.g. user:alice@example.com) resolves deleteAclRule. Requires the owner role on the calendar.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-calendar",
  run: async (input, ctx) => {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/acl`,
    );
    url.searchParams.set("maxResults", String(input.maxResults ?? 20));
    if (input.pageToken !== undefined)
      url.searchParams.set("pageToken", input.pageToken);

    const res = await ctx.fetch(url.toString(), { method: "GET" });
    await throwForGoogleCalendar(res, "listAclRules");
    const payload = (await res.json()) as {
      items?: unknown;
      nextPageToken?: string;
    };
    return {
      rules: payload.items ?? [],
      next_page_token: payload.nextPageToken,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
