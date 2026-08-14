#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  driveSchema,
  graphFetch,
} from "../lib/microsoft-onedrive.ts";

const inputSchema = z
  .object({
    driveId: z
      .string()
      .describe("Drive id from listDrives. Omit for the caller's own OneDrive.")
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "getDrive",
  title: "Get Drive",
  description:
    "Get a drive's metadata and storage quota (used / remaining bytes). Omit driveId for the caller's own OneDrive; pass one from listDrives to target another drive.",
  inputSchema,
  outputSchema: driveSchema.describe("The drive."),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-onedrive",
  run: async (input, ctx) => {
    const res = await graphFetch(ctx.fetch, driveBase(input.driveId));
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
