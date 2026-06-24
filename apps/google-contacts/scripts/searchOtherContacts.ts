#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  PersonSchema,
  throwForGoogleContacts,
} from "../lib/google-contacts.ts";

const inputSchema = z
  .object({
    query: z
      .string()
      .describe(
        "Prefix phrase matched against names, emails, and phones of other contacts.",
      ),
    readMask: z
      .string()
      .describe(
        "Comma-separated fields to return. Other contacts support only emailAddresses, metadata, names, phoneNumbers, and photos.",
      )
      .default("names,emailAddresses,phoneNumbers,metadata"),
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
  name: "searchOtherContacts",
  title: "Search Other Contacts",
  description:
    'Search the user\'s "other contacts" by name, email, or phone (prefix matching). Same lazy-index caveat as searchContacts — recently-seen contacts may lag.',
  inputSchema,
  outputSchema: z.object({
    results: z
      .array(z.object({ person: PersonSchema.optional() }))
      .optional()
      .describe("Matching other contacts."),
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
      "https://people.googleapis.com/v1/otherContacts:search",
    );
    url.searchParams.set("query", input.query);
    url.searchParams.set("readMask", input.readMask);
    url.searchParams.set("pageSize", String(input.pageSize ?? 10));
    const res = await ctx.fetch(url.toString(), { method: "GET" });
    await throwForGoogleContacts(res, "searchOtherContacts");
    // searchOtherContacts does not paginate (no pageToken in, no cursor out).
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
