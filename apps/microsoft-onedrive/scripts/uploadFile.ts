#!/usr/bin/env node
// Uploading a binary file is a 3-step composition: download the source bytes,
// open a resumable upload session against Graph, then PUT the bytes to the
// session's pre-authenticated URL (no auth header). The session orchestration
// lives in lib/microsoft-onedrive.ts.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  driveItemSchema,
  uploadToSession,
} from "../lib/microsoft-onedrive.ts";

const inputSchema = z
  .object({
    driveId: z
      .string()
      .describe("Drive id from listDrives. Omit for the caller's own OneDrive.")
      .optional(),
    parentItemId: z
      .string()
      .describe(
        "Destination folder id (from listFolderItems / getItem). Omit to upload to the drive root.",
      )
      .optional(),
    fileName: z
      .string()
      .describe("File name for the uploaded file (include the extension)."),
    fileUrl: z
      .string()
      .url()
      .describe(
        "URL the connector downloads the source bytes from. For plain text, use uploadTextFile instead (no URL needed).",
      ),
    conflictBehavior: z
      .enum(["rename", "replace"])
      .describe(
        "What to do if a file with this name already exists. Defaults to rename (the agent-safe choice).",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "uploadFile",
  title: "Upload File",
  description:
    "Upload a binary file to OneDrive from a source URL, handling large files via a resumable upload session. Pass driveId to target a specific drive (omit for the caller's own) and parentItemId to nest it (omit for the root). Use uploadTextFile for agent-generated text.",
  inputSchema,
  outputSchema: driveItemSchema.describe("The uploaded file."),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-onedrive",
  run: async (input, ctx) => {
    // 1. Fetch the source bytes with a bare fetch — the fileUrl is an arbitrary
    // caller-provided host, so OneDrive credentials must NOT be sent to it.
    const src = await globalThis.fetch(input.fileUrl);
    if (!src.ok) {
      throw new Error(
        `Microsoft OneDrive uploadFile: could not download source from fileUrl (HTTP ${src.status}).`,
      );
    }
    const bytes = new Uint8Array(await src.arrayBuffer());

    // 2. Address the destination by parent-and-name (root or a folder).
    const anchor = input.parentItemId
      ? `items/${encodeURIComponent(input.parentItemId)}:`
      : "root:";
    const sessionUrl = `${driveBase(input.driveId)}/${anchor}/${encodeURIComponent(input.fileName)}:/createUploadSession`;

    // 3. Stream the bytes through the resumable session.
    return uploadToSession(
      ctx.fetch,
      sessionUrl,
      bytes,
      input.conflictBehavior ?? "rename",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
