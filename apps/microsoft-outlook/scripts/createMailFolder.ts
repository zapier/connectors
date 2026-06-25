#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH_BASE,
  mailboxRoot,
  outlookFetch,
  parseGraphResponse,
} from "../lib/graph.ts";

const inputSchema = z
  .object({
    displayName: z.string().describe("Folder name as shown in Outlook."),
    parentFolderId: z
      .string()
      .describe(
        "Set a folder id (or well-known name from listMailFolders) to create the folder as a subfolder of it. Omit to create at the top level.",
      )
      .optional(),
    mailbox: z
      .string()
      .describe(
        "Shared-mailbox address (UPN/email) to create the folder in instead of your own, e.g. team@contoso.com. Requires shared-mailbox delegation. Omit for your own mailbox.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  parentFolderId: z.string().optional(),
});

const definition = defineTool({
  name: "createMailFolder",
  title: "Create Mail Folder",
  description:
    "Create a mail folder, returning its id. Creates a top-level folder by default, or a subfolder when parentFolderId is set (resolve the parent id via listMailFolders). Use the returned id as folderId/destinationId in other mail tools.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-outlook",
  run: async (input, ctx) => {
    const root = mailboxRoot(input.mailbox);
    const path =
      input.parentFolderId !== undefined
        ? `${root}/mailFolders/${encodeURIComponent(input.parentFolderId)}/childFolders`
        : `${root}/mailFolders`;
    const url = `${GRAPH_BASE}${path}`;
    const res = await outlookFetch(ctx.fetch, "createMailFolder", url, {
      method: "POST",
      body: JSON.stringify({ displayName: input.displayName }),
    });
    return parseGraphResponse(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
