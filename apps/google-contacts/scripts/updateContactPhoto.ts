#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  PersonResponseSchema,
  throwForGoogleContacts,
} from "../lib/google-contacts.ts";

const inputSchema = z
  .object({
    resourceName: z
      .string()
      .describe(
        "Contact resource name, e.g. people/c12345 (from listContacts or searchContacts). Pass it whole, including the people/ prefix.",
      ),
    photoBytes: z
      .string()
      .describe("The contact photo as a base64-encoded image string."),
    personFields: z
      .string()
      .describe(
        "Which fields to return on the updated contact. Defaults to a comprehensive set.",
      )
      .default("names,emailAddresses,phoneNumbers,photos,metadata"),
  })
  .strict();

const definition = defineTool({
  name: "updateContactPhoto",
  title: "Update Contact Photo",
  description:
    "Set or replace a contact's photo. photoBytes is the image as a base64-encoded string (not a URL or file path).",
  inputSchema,
  outputSchema: PersonResponseSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-contacts",
  run: async (input, ctx) => {
    // resourceName (people/c…) is a Google resource path — the slash is significant
    // and must NOT be percent-encoded.
    const url = `https://people.googleapis.com/v1/${input.resourceName}:updateContactPhoto`;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photoBytes: input.photoBytes,
        personFields: input.personFields,
      }),
    });
    await throwForGoogleContacts(res, "updateContactPhoto");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
