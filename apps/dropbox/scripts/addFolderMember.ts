#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { API_BASE, readDropbox, tagged } from "../lib/dropbox.ts";

const inputSchema = z
  .object({
    shared_folder_id: z
      .string()
      .describe("ID of the shared folder. Resolve it via listSharedFolders."),
    members: z
      .array(z.string())
      .min(1)
      .describe('Email addresses of the people to add, e.g. ["sam@acme.com"].'),
    access_level: z
      .enum(["editor", "viewer", "viewer_no_comment", "traverse"])
      .describe(
        "Access the new members get — editor (view + edit), viewer (view + comment), viewer_no_comment, or traverse (see the folder only).",
      ),
    quiet: z
      .boolean()
      .describe("If true, do not email the new members. Default false.")
      .optional(),
    custom_message: z
      .string()
      .describe(
        "Optional note included in the notification email (ignored when quiet is true).",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  shared_folder_id: z.string(),
  members_added: z
    .array(z.string())
    .describe("Emails that were added (echoed for legibility)."),
});

const definition = defineTool({
  name: "addFolderMember",
  title: "Add Folder Member",
  description:
    "Add one or more members (by email) to a shared folder, with a chosen access level. Optionally notify them with a message.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "dropbox",
  run: async (input, ctx) => {
    // Each email wraps into an AddMember whose member is a Stone email union and
    // whose access_level is the shared access level applied to the whole batch.
    const res = await ctx.fetch(`${API_BASE}/2/sharing/add_folder_member`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shared_folder_id: input.shared_folder_id,
        members: input.members.map((email) => ({
          member: { ".tag": "email", email },
          access_level: tagged(input.access_level),
        })),
        quiet: input.quiet,
        custom_message: input.custom_message,
      }),
    });
    // The wire returns void/empty on success; readDropbox throws on error. We
    // ignore the (empty) body and echo the request for agent legibility.
    await readDropbox("addFolderMember", res);
    return {
      shared_folder_id: input.shared_folder_id,
      members_added: input.members,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
