#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  API_BASE,
  DropboxApiError,
  mapSharedLink,
  NAMESPACE_ID_DESCRIBE,
  pathRootHeader,
  readDropbox,
  sharedLinkSchema,
  tagged,
} from "../lib/dropbox.ts";

const inputSchema = z
  .object({
    path: z
      .string()
      .describe(
        "Path of the file or folder to share, e.g. /Documents/report.pdf.",
      ),
    requested_visibility: z
      .enum(["public", "team_only", "password"])
      .describe(
        "Who can open the link. public = anyone with the link; team_only = same-team members; password = anyone with the link password. Some options require a paid plan.",
      )
      .optional(),
    link_password: z
      .string()
      .describe(
        "Required when requested_visibility is password — the password needed to open the link.",
      )
      .optional(),
    expires: z
      .string()
      .datetime({ offset: true })
      .describe(
        "ISO-8601 time when the link should stop working. Omit for a non-expiring link. Expiration requires a paid plan.",
      )
      .optional(),
    namespace_id: z.string().describe(NAMESPACE_ID_DESCRIBE).optional(),
  })
  .strict();

const definition = defineTool({
  name: "createSharedLink",
  title: "Create Shared Link",
  description:
    "Create a durable shareable link for a file or folder. If a link already exists for the path, returns the existing one instead of failing. For a short-lived direct download URL use getTemporaryLink instead.",
  inputSchema,
  outputSchema: sharedLinkSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "dropbox",
  run: async (input, ctx) => {
    const settings: Record<string, unknown> = {};
    if (input.requested_visibility !== undefined) {
      settings.requested_visibility = tagged(input.requested_visibility);
    }
    if (input.link_password !== undefined) {
      settings.link_password = input.link_password;
    }
    if (input.expires !== undefined) settings.expires = input.expires;

    const headers = {
      "Content-Type": "application/json",
      ...pathRootHeader(input.namespace_id),
    };
    const body: Record<string, unknown> = { path: input.path };
    if (Object.keys(settings).length > 0) body.settings = settings;

    const res = await ctx.fetch(
      `${API_BASE}/2/sharing/create_shared_link_with_settings`,
      { method: "POST", headers, body: JSON.stringify(body) },
    );
    try {
      const data = await readDropbox("createSharedLink", res);
      return mapSharedLink(data);
    } catch (err) {
      // A link may already exist for the path. The error's attached metadata is
      // frequently null, so recover by looking the existing link up directly.
      if (
        err instanceof DropboxApiError &&
        err.summary.startsWith("shared_link_already_exists")
      ) {
        const listRes = await ctx.fetch(
          `${API_BASE}/2/sharing/list_shared_links`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ path: input.path, direct_only: true }),
          },
        );
        const list = await readDropbox<{ links?: unknown[] }>(
          "createSharedLink",
          listRes,
        );
        const existing = list.links?.[0];
        if (existing) return mapSharedLink(existing);
      }
      throw err;
    }
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
