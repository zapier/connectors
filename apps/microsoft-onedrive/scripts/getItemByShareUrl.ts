#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveItemSchema,
  GRAPH,
  graphFetch,
} from "../lib/microsoft-onedrive.ts";

const inputSchema = z
  .object({
    sharingUrl: z
      .string()
      .describe(
        "The sharing URL as pasted (e.g. https://…-my.sharepoint.com/:w:/g/…), or a bare share id. A raw URL is base64url-encoded into Graph's u! share token automatically.",
      ),
  })
  .strict();

/**
 * Encode a raw sharing URL into Graph's `u!` share token: base64, strip
 * trailing `=`, then `/`→`_` and `+`→`-`. A value that isn't an http(s) URL is
 * assumed to already be a share id / token and passed through unchanged.
 */
function encodeShareToken(sharingUrl: string): string {
  if (!/^https?:\/\//i.test(sharingUrl)) return sharingUrl;
  const b64 = btoa(sharingUrl);
  return "u!" + b64.replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");
}

const definition = defineTool({
  name: "getItemByShareUrl",
  title: "Get Item By Share URL",
  description:
    "Resolve a OneDrive/SharePoint sharing URL (or share id) to the file or folder it points to, so it can be read or acted on with other tools. Shared items return a remoteItem facet whose id + parentReference.driveId address the item on the owner's drive — pass them as itemId + driveId to other tools.",
  inputSchema,
  outputSchema: driveItemSchema.describe("The shared file or folder."),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-onedrive",
  run: async (input, ctx) => {
    // Graph addresses a shared item by the encoded sharing URL: /shares/{token}.
    const token = encodeShareToken(input.sharingUrl);
    const url = `${GRAPH}/shares/${encodeURIComponent(token)}/driveItem`;
    const res = await graphFetch(ctx.fetch, url);
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
