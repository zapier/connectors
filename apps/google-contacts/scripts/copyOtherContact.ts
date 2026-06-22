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
    resourceName: z
      .string()
      .describe(
        "Other-contact resource name, e.g. otherContacts/c12345 (from listOtherContacts or searchOtherContacts).",
      ),
    copyMask: z
      .string()
      .describe(
        "Which fields to copy onto the new contact. Defaults to names, emails, and phones.",
      )
      .default("names,emailAddresses,phoneNumbers"),
  })
  .strict();

const definition = defineTool({
  name: "copyOtherContact",
  title: "Copy Other Contact",
  description:
    'Promote an "other contact" into the user\'s saved contacts (myContacts), returning an editable contact with a people/c… resourceName.',
  inputSchema,
  outputSchema: PersonSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-contacts",
  run: async (input, ctx) => {
    // resourceName (otherContacts/…) is a Google resource path — the slash is
    // significant and must NOT be percent-encoded.
    const url = `https://people.googleapis.com/v1/${input.resourceName}:copyOtherContactToMyContactsGroup`;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ copyMask: input.copyMask }),
    });
    await throwForGoogleContacts(res, "copyOtherContactToMyContactsGroup");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
