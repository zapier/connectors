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
        "Contact resource name, e.g. people/c12345 (from listContacts or searchContacts). Pass it whole, including the people/ prefix.",
      ),
  })
  .strict();

const definition = defineTool({
  name: "deleteContact",
  title: "Delete Contact",
  description:
    "Delete a contact from the user's account. A 404 means the contact does not exist (already deleted or wrong id).",
  inputSchema,
  outputSchema: z.object({
    success: z
      .boolean()
      .describe(
        "True when the contact was deleted (the API returns an empty body).",
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
    // resourceName (people/c…) is a Google resource path — the slash is significant
    // and must NOT be percent-encoded.
    const url = `https://people.googleapis.com/v1/${input.resourceName}:deleteContact`;
    const res = await ctx.fetch(url, { method: "DELETE" });
    await throwForGoogleContacts(res, "deleteContact");
    return { success: true };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
