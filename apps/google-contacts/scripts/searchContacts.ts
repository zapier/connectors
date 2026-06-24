#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  DEFAULT_PERSON_FIELDS,
  PersonSchema,
  throwForGoogleContacts,
} from "../lib/google-contacts.ts";

const inputSchema = z
  .object({
    query: z
      .string()
      .describe(
        'Prefix phrase matched against names, nicknames, emails, phones, and organizations. "foo n" matches "foo name"; "oo n" does not.',
      ),
    readMask: z
      .string()
      .describe(
        "Comma-separated list of contact fields to return on each match. Defaults to a comprehensive set.",
      )
      .default(DEFAULT_PERSON_FIELDS),
    pageSize: z
      .number()
      .int()
      .gte(1)
      .lte(30)
      .describe(
        "Max results per page. Caps at 30. Defaults to 10 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "searchContacts",
  title: "Search Contacts",
  description:
    "Search the user's contacts by name, nickname, email, phone, or organization (prefix matching). Newly created/updated contacts may lag a few minutes behind — use listContacts when freshness matters.",
  inputSchema,
  outputSchema: z.object({
    results: z
      .array(z.object({ person: PersonSchema.optional() }))
      .optional()
      .describe("Matching contacts."),
  }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-contacts",
  run: async (input, ctx) => {
    const url = new URL(
      "https://people.googleapis.com/v1/people:searchContacts",
    );
    url.searchParams.set("query", input.query);
    url.searchParams.set("readMask", input.readMask);
    url.searchParams.set("pageSize", String(input.pageSize ?? 10));
    const res = await ctx.fetch(url.toString(), { method: "GET" });
    await throwForGoogleContacts(res, "searchContacts");
    // searchContacts does not paginate (no pageToken in, no cursor out).
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
