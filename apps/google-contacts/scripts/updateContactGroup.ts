#!/usr/bin/env node
// updateContactGroup is an etag read-modify-write — contactGroups.update (PUT) requires
// the group's current etag, so run() first GETs the group for the fresh etag, then PUTs.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  ContactGroupSchema,
  throwForGoogleContacts,
} from "../lib/google-contacts.ts";

const inputSchema = z
  .object({
    resourceName: z
      .string()
      .describe(
        "Contact group to rename, e.g. contactGroups/1a2b3c (from listContactGroups). System groups (myContacts, starred) cannot be renamed.",
      ),
    name: z.string().describe("The new contact group (label) name."),
  })
  .strict();

const definition = defineTool({
  name: "updateContactGroup",
  title: "Update Contact Group",
  description:
    "Rename an existing user contact group (label). Only USER_CONTACT_GROUPs can be renamed — system groups (myContacts, starred) are rejected. Check groupType via listContactGroups.",
  inputSchema,
  outputSchema: ContactGroupSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-contacts",
  run: async (input, ctx) => {
    // resourceName (contactGroups/…) is a Google resource path — the slash is
    // significant and must NOT be percent-encoded.
    const base = `https://people.googleapis.com/v1/${input.resourceName}`;

    // Step 1: read the current group for its fresh etag (required by the API).
    const getUrl = new URL(base);
    getUrl.searchParams.set("groupFields", "metadata");
    const getRes = await ctx.fetch(getUrl.toString(), { method: "GET" });
    await throwForGoogleContacts(getRes, "updateContactGroup");
    const current = (await getRes.json()) as { etag?: string };

    // Step 2: PUT the new name with the etag.
    const putRes = await ctx.fetch(base, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactGroup: { etag: current.etag, name: input.name },
        updateGroupFields: "name",
      }),
    });
    await throwForGoogleContacts(putRes, "updateContactGroup");
    return putRes.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
