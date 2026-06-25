#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  DEFAULT_PERSON_FIELDS,
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
    personFields: z
      .string()
      .describe(
        "Comma-separated list of contact fields to return (e.g. names,emailAddresses,phoneNumbers). Defaults to a comprehensive set; narrow it to reduce payload. Include metadata for the etag.",
      )
      .default(DEFAULT_PERSON_FIELDS),
  })
  .strict();

const definition = defineTool({
  name: "deleteContactPhoto",
  title: "Delete Contact Photo",
  description: "Remove a contact's photo, reverting to the default avatar.",
  inputSchema,
  outputSchema: PersonResponseSchema,
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
    const url = new URL(
      `https://people.googleapis.com/v1/${input.resourceName}:deleteContactPhoto`,
    );
    url.searchParams.set("personFields", input.personFields);
    const res = await ctx.fetch(url.toString(), { method: "DELETE" });
    await throwForGoogleContacts(res, "deleteContactPhoto");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
