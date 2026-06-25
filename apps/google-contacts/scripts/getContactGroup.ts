#!/usr/bin/env node
// A single GET /v1/contactGroups/{id}. Kept as its own tool because the bare
// "GET /{resourceName}" path+method is shared with getContact (people/* vs
// contactGroups/*), and the two resources need different field params and parsing.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  ContactGroupSchema,
  DEFAULT_GROUP_FIELDS,
  throwForGoogleContacts,
} from "../lib/google-contacts.ts";

const inputSchema = z
  .object({
    resourceName: z
      .string()
      .describe(
        "Contact group resource name, e.g. contactGroups/1a2b3c (from listContactGroups). Pass it whole, including the contactGroups/ prefix.",
      ),
    maxMembers: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Include up to this many member contact resource names (people/c…) in memberResourceNames. Omit to return group metadata only.",
      )
      .optional(),
    groupFields: z
      .string()
      .describe(
        "Comma-separated list of contact-group fields to return (e.g. name,groupType,memberCount).",
      )
      .default(DEFAULT_GROUP_FIELDS),
  })
  .strict();

const definition = defineTool({
  name: "getContactGroup",
  title: "Get Contact Group",
  description:
    "Get a single contact group (label) by resource name, optionally with its member contact resource names (set maxMembers).",
  inputSchema,
  outputSchema: ContactGroupSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-contacts",
  run: async (input, ctx) => {
    // resourceName (contactGroups/…) is a Google resource path — the slash is
    // significant and must NOT be percent-encoded.
    const url = new URL(
      `https://people.googleapis.com/v1/${input.resourceName}`,
    );
    url.searchParams.set("groupFields", input.groupFields);
    if (input.maxMembers !== undefined) {
      url.searchParams.set("maxMembers", String(input.maxMembers));
    }
    const res = await ctx.fetch(url.toString(), { method: "GET" });
    await throwForGoogleContacts(res, "getContactGroup");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
