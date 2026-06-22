#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  ContactGroupSchema,
  throwForGoogleContacts,
} from "../lib/google-contacts.ts";

const inputSchema = z
  .object({
    name: z
      .string()
      .describe(
        "The contact group (label) name. A duplicate name returns an already-exists error.",
      ),
  })
  .strict();

const definition = defineTool({
  name: "createContactGroup",
  title: "Create Contact Group",
  description:
    "Create a new user contact group (label). Returns the resourceName used to add members via modifyContactGroupMembers.",
  inputSchema,
  outputSchema: ContactGroupSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-contacts",
  run: async (input, ctx) => {
    const res = await ctx.fetch(
      "https://people.googleapis.com/v1/contactGroups",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactGroup: { name: input.name } }),
      },
    );
    await throwForGoogleContacts(res, "createContactGroup");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
