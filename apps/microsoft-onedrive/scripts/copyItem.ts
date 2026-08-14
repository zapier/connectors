#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { driveBase, graphFetch } from "../lib/microsoft-onedrive.ts";

const inputSchema = z
  .object({
    itemId: z
      .string()
      .describe(
        "Item id to copy. Resolve via findFiles / findItemsByKql / listFolderItems.",
      ),
    driveId: z
      .string()
      .describe(
        "Source drive id from listDrives. Omit for the caller's own OneDrive.",
      )
      .optional(),
    targetDriveId: z
      .string()
      .describe(
        "Destination drive id (parentReference.driveId) from listDrives. Omit to copy within the source drive.",
      )
      .optional(),
    targetParentItemId: z
      .string()
      .describe("Destination folder id. Omit for the destination drive root.")
      .optional(),
    newName: z
      .string()
      .describe("Name for the copy. Omit to keep the source name.")
      .optional(),
    conflictBehavior: z
      .enum(["rename", "replace", "fail"])
      .describe(
        "Behavior on name conflict: rename, replace, or fail. Defaults to rename (the agent-safe choice). Graph's own default is fail, which accepts the copy with 202 up front but then reports status: failed at the monitor URL — so with fail a conflict surfaces only when you poll getCopyStatus, not on the initial call.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  monitorUrl: z
    .string()
    .describe("URL to poll with getCopyStatus for the async copy result."),
  status: z
    .literal("accepted")
    .describe('Always "accepted" — the copy runs asynchronously.'),
});

const definition = defineTool({
  name: "copyItem",
  title: "Copy Item",
  description:
    "Copy a file or folder to another folder or drive. Returns a monitor URL to poll with getCopyStatus; the copy runs asynchronously. Name conflicts default to rename; set conflictBehavior=fail to reject them instead (a failed copy is reported as status: failed at the monitor URL, not on the initial call).",
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
    // parentReference is only sent when a destination drive and/or folder is
    // given; with neither, Graph copies within the source folder (a same-folder
    // duplicate, usually paired with newName).
    const parentReference = {
      ...(input.targetDriveId ? { driveId: input.targetDriveId } : {}),
      ...(input.targetParentItemId ? { id: input.targetParentItemId } : {}),
    };
    const body = {
      ...(Object.keys(parentReference).length ? { parentReference } : {}),
      ...(input.newName ? { name: input.newName } : {}),
      "@microsoft.graph.conflictBehavior": input.conflictBehavior ?? "rename",
    };
    const url = `${driveBase(input.driveId)}/items/${encodeURIComponent(input.itemId)}/copy`;
    // Async op: 202 with no body, just a Location header pointing at the
    // monitor URL. Surface that URL rather than parsing a (nonexistent) body.
    const res = await graphFetch(ctx.fetch, url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const monitorUrl = res.headers.get("Location");
    if (!monitorUrl) {
      throw new Error(
        "Microsoft OneDrive copyItem: the copy was accepted (202) but no Location monitor URL was returned.",
      );
    }
    return { monitorUrl, status: "accepted" as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
