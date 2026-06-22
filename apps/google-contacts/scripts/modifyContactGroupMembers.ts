#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForGoogleContacts } from "../lib/google-contacts.ts";

const inputSchema = z
  .object({
    resourceName: z
      .string()
      .describe(
        "Contact group resource name, e.g. contactGroups/1a2b3c (from listContactGroups).",
      ),
    resourceNamesToAdd: z
      .array(z.string())
      .describe("Contact resource names (people/c…) to add to the group.")
      .optional(),
    resourceNamesToRemove: z
      .array(z.string())
      .describe("Contact resource names (people/c…) to remove from the group.")
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "modifyContactGroupMembers",
  title: "Modify Contact Group Members",
  description:
    "Add and/or remove contacts in a contact group without disturbing other memberships. Combined add+remove must be 1000 or fewer.",
  inputSchema,
  outputSchema: z.object({
    notFoundResourceNames: z
      .array(z.string())
      .optional()
      .describe("Resource names that could not be found and were skipped."),
    canNotRemoveLastContactGroupResourceNames: z
      .array(z.string())
      .optional()
      .describe(
        "Contacts that could not be removed because it was their only group (every contact stays in myContacts).",
      ),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-contacts",
  run: async (input, ctx) => {
    // resourceName (contactGroups/…) is a Google resource path — the slash is
    // significant and must NOT be percent-encoded.
    const url = `https://people.googleapis.com/v1/${input.resourceName}/members:modify`;
    const body: Record<string, unknown> = {};
    if (input.resourceNamesToAdd !== undefined)
      body.resourceNamesToAdd = input.resourceNamesToAdd;
    if (input.resourceNamesToRemove !== undefined)
      body.resourceNamesToRemove = input.resourceNamesToRemove;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwForGoogleContacts(res, "modifyContactGroupMembers");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
