#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  driveItemSchema,
  graphFetch,
} from "../lib/microsoft-onedrive.ts";

const inputSchema = z
  .object({
    parentItemId: z
      .string()
      .describe(
        "Parent folder id (from listFolderItems / getItem). Omit to create the folder at the drive root.",
      )
      .optional(),
    driveId: z
      .string()
      .describe("Drive id from listDrives. Omit for the caller's own OneDrive.")
      .optional(),
    name: z.string().describe("New folder name."),
    conflictBehavior: z
      .enum(["rename", "replace", "fail"])
      .describe(
        "What to do if a folder with this name already exists. Defaults to rename (the agent-safe choice; Graph's own default is fail).",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "createFolder",
  title: "Create Folder",
  description:
    "Create a folder in a drive, at the root or inside another folder. Pass driveId to target a specific drive (omit for the caller's own) and parentItemId to nest it (omit for the root).",
  inputSchema,
  outputSchema: driveItemSchema.describe("The created folder."),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-onedrive",
  run: async (input, ctx) => {
    // Root vs. nested: with a parentItemId address that folder's children;
    // without one, the drive root's children collection.
    const parent = input.parentItemId
      ? `items/${encodeURIComponent(input.parentItemId)}`
      : "root";
    const url = `${driveBase(input.driveId)}/${parent}/children`;
    const body = {
      name: input.name,
      folder: {},
      "@microsoft.graph.conflictBehavior": input.conflictBehavior ?? "rename",
    };
    const res = await graphFetch(ctx.fetch, url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
