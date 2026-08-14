#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  permissionSchema,
  throwGraphError,
  unwrapList,
} from "../lib/microsoft-onedrive.ts";

const inputSchema = z
  .object({
    itemId: z
      .string()
      .describe(
        "File or folder id to share. Resolve via findFiles / findItemsByKql / listFolderItems.",
      ),
    driveId: z
      .string()
      .describe("Drive id from listDrives. Omit for the caller's own OneDrive.")
      .optional(),
    recipients: z
      .array(
        z
          .object({ email: z.string().describe("Recipient email address.") })
          .strict(),
      )
      .describe("People to grant access to."),
    roles: z
      .array(z.enum(["read", "write"]))
      .describe('Permission level to grant, e.g. ["read"].'),
    requireSignIn: z
      .boolean()
      .describe("Require recipients to sign in. Defaults to true.")
      .optional(),
    sendInvitation: z
      .boolean()
      .describe("Email an invitation. Defaults to true.")
      .optional(),
    message: z
      .string()
      .describe("Message to include in the invitation (max 2000 characters).")
      .optional(),
    expirationDateTime: z
      .string()
      .datetime({ offset: true })
      .describe("When the granted access expires (ISO 8601).")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  items: z
    .array(permissionSchema)
    .describe("The created permission per recipient."),
});

const definition = defineTool({
  name: "inviteToItem",
  title: "Invite To Item",
  description:
    "Grant named people read or write access to a file or folder, optionally emailing an invitation. Pass driveId to target a specific drive (omit for the caller's own). Partial failures return per-recipient errors; check every result.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-onedrive",
  run: async (input, ctx) => {
    const url = `${driveBase(input.driveId)}/items/${encodeURIComponent(input.itemId)}/invite`;
    const body = {
      recipients: input.recipients.map((r) => ({ email: r.email })),
      roles: input.roles,
      requireSignIn: input.requireSignIn ?? true,
      sendInvitation: input.sendInvitation ?? true,
      ...(input.message ? { message: input.message } : {}),
      ...(input.expirationDateTime
        ? { expirationDateTime: input.expirationDateTime }
        : {}),
    };
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // Graph returns 207 Multi-Status on partial success (some recipients
    // failed). 207 is a success status, so it flows through as a normal result
    // — the explicit exclusion keeps it out of the error path even if a runtime
    // treats it as non-ok. Parse the body and surface the per-recipient
    // permission results; route every other non-2xx through the SDK error path.
    if (!res.ok && res.status !== 207) {
      await throwGraphError(res);
    }
    return { items: unwrapList(await res.json()).items };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
