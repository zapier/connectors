#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  driveItemSchema,
  graphFetch,
  withQuery,
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
    parentItemId: z
      .string()
      .describe(
        "Destination folder id (from listFolderItems / getItem). Omit to write to the drive root.",
      )
      .optional(),
    fileName: z
      .string()
      .describe('File name including extension, e.g. "notes.txt".'),
    content: z.string().describe("UTF-8 text content to write to the file."),
    conflictBehavior: z
      .enum(["rename", "replace"])
      .describe(
        "What to do if a file with this name already exists. Defaults to rename (the agent-safe choice).",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "uploadTextFile",
  title: "Upload Text File",
  description:
    "Write UTF-8 text content to a new file (simple upload). Use for agent-generated text; use uploadFile for binary or large files. Pass driveId to target a specific library (omit for the site's default) and parentItemId to nest it (omit for the drive root).",
  inputSchema,
  outputSchema: driveItemSchema.describe("The uploaded file."),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    // The destination is addressed by parent-and-name: {parent}:/{fileName}:.
    // With a parentItemId that folder's colon-path; without one, the drive root.
    const parent = input.parentItemId
      ? `items/${encodeURIComponent(input.parentItemId)}:`
      : "root:";
    const url = withQuery(
      `${driveBase(input.siteId, input.driveId)}/${parent}/${encodeURIComponent(input.fileName)}:/content`,
      {
        "@microsoft.graph.conflictBehavior": input.conflictBehavior ?? "rename",
      },
    );
    // Raw text body — NOT JSON. graphFetch won't override the explicit
    // text/plain Content-Type, so the string is sent verbatim.
    const res = await graphFetch(ctx.fetch, url, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: input.content,
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
