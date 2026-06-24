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
        "Contact group resource name, e.g. contactGroups/1a2b3c (from listContactGroups). Pass it whole, including the contactGroups/ prefix.",
      ),
    deleteContacts: z
      .boolean()
      .describe(
        "When true, also delete the contacts that were in the group (not just the label). Defaults to false (label only).",
      )
      .default(false),
  })
  .strict();

const definition = defineTool({
  name: "deleteContactGroup",
  title: "Delete Contact Group",
  description:
    "Delete a user contact group (label). System groups (myContacts, starred) cannot be deleted. Optionally delete the member contacts too.",
  inputSchema,
  outputSchema: z.object({
    success: z
      .boolean()
      .describe(
        "True when the group was deleted (the API returns an empty body).",
      ),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
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
    url.searchParams.set("deleteContacts", String(input.deleteContacts));
    const res = await ctx.fetch(url.toString(), { method: "DELETE" });
    await throwForGoogleContacts(res, "deleteContactGroup");
    return { success: true };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
