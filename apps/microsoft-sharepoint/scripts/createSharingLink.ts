#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  graphFetch,
  permissionSchema,
} from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    siteId: z.string().describe("Site id from findSites."),
    driveId: z
      .string()
      .describe(
        "Document library id from listDrives. Omit for the site's default library.",
      )
      .optional(),
    itemId: z.string().describe("File or folder id to share."),
    type: z
      .enum(["view", "edit", "embed"])
      .describe(
        "Link permission. view=read-only, edit=read-write. embed is personal-OneDrive only — use view/edit for SharePoint.",
      ),
    scope: z
      .enum(["anonymous", "organization", "users"])
      .describe(
        "Who can use the link. organization is SharePoint/business only. Omit for the org default.",
      )
      .optional(),
    expirationDateTime: z
      .string()
      .datetime({ offset: true })
      .describe("When the link expires (ISO 8601).")
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "createSharingLink",
  title: "Create Sharing Link",
  description:
    "Create a shareable link (view, edit, or embed) to a file or folder. The shareable URL is returned in link.webUrl. Use view/edit for SharePoint; embed is personal-OneDrive only. Pass driveId to target a specific library (omit for the site's default).",
  inputSchema,
  outputSchema: permissionSchema.describe(
    "The created sharing-link permission.",
  ),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    const url = `${driveBase(input.siteId, input.driveId)}/items/${encodeURIComponent(input.itemId)}/createLink`;
    const body = {
      type: input.type,
      ...(input.scope ? { scope: input.scope } : {}),
      ...(input.expirationDateTime
        ? { expirationDateTime: input.expirationDateTime }
        : {}),
    };
    // 201 for a new link, 200 if a link of this type already exists for the
    // calling app (idempotent per app+type); graphFetch treats both as ok.
    const res = await graphFetch(ctx.fetch, url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
