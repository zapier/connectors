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
  name: "getContact",
  title: "Get Contact",
  description:
    "Retrieve a single contact by resource name, with full field detail. Call before an additive update to read the existing arrays.",
  inputSchema,
  outputSchema: PersonSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-contacts",
  run: async (input, ctx) => {
    // resourceName (people/c…) is a Google resource path — the slash is significant
    // and must NOT be percent-encoded, so it is interpolated raw, not via encodeURIComponent.
    const url = new URL(
      `https://people.googleapis.com/v1/${input.resourceName}`,
    );
    url.searchParams.set("personFields", input.personFields);
    const res = await ctx.fetch(url.toString(), { method: "GET" });
    await throwForGoogleContacts(res, "getContact");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
