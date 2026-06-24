#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  API_BASE,
  mapSharedLink,
  readDropbox,
  sharedLinkSchema,
  tagged,
} from "../lib/dropbox.ts";

const inputSchema = z
  .object({
    url: z
      .string()
      .describe(
        "The existing shared-link URL to modify, e.g. https://www.dropbox.com/s/abc/file.txt?dl=0. Find it via listSharedLinks.",
      ),
    requested_visibility: z
      .enum(["public", "team_only", "password"])
      .describe("New visibility for the link.")
      .optional(),
    link_password: z
      .string()
      .describe(
        "Set a new link password (pair with requested_visibility=password).",
      )
      .optional(),
    expires: z
      .string()
      .datetime({ offset: true })
      .describe(
        "New ISO-8601 expiration time for the link. Fields `expires` and `remove_expiration` are mutually exclusive — pass at most one.",
      )
      .optional(),
    remove_expiration: z
      .boolean()
      .describe(
        "Set true to clear an existing expiration (do not also pass expires). Fields `expires` and `remove_expiration` are mutually exclusive — pass at most one.",
      )
      .optional(),
    audience: z
      .enum(["public", "team", "no_one"])
      .describe("Who the link is visible to.")
      .optional(),
    access: z
      .enum(["viewer", "editor", "max", "default"])
      .describe(
        "What link recipients can do — view/comment (viewer) or edit (editor). Some levels require a paid plan.",
      )
      .optional(),
    allow_download: z
      .boolean()
      .describe("Allow or block downloading the content through the link.")
      .optional(),
  })
  .strict()
  .refine(
    (input) =>
      [input.expires, input.remove_expiration].filter((v) => v !== undefined)
        .length <= 1,
    {
      message:
        "Fields `expires` and `remove_expiration` are mutually exclusive — pass at most one.",
      path: ["expires"],
    },
  )
  .meta({ allOf: [{ not: { required: ["expires", "remove_expiration"] } }] });

const definition = defineTool({
  name: "modifySharedLinkSettings",
  title: "Modify Shared Link Settings",
  description:
    "Change the settings of an existing shared link — visibility, password, expiration, audience, access level, or download permission. Pass only the settings you want to change.",
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
    // Most settings travel inside a `settings` object; the enum-valued ones wrap as
    // Stone unions ({ ".tag": value }). `remove_expiration` is the exception — it's a
    // TOP-LEVEL wire flag, not part of `settings`.
    const settings: Record<string, unknown> = {};
    if (input.requested_visibility !== undefined) {
      settings.requested_visibility = tagged(input.requested_visibility);
    }
    if (input.audience !== undefined)
      settings.audience = tagged(input.audience);
    if (input.access !== undefined) settings.access = tagged(input.access);
    if (input.link_password !== undefined) {
      settings.link_password = input.link_password;
    }
    if (input.expires !== undefined) settings.expires = input.expires;
    if (input.allow_download !== undefined) {
      settings.allow_download = input.allow_download;
    }

    const body: Record<string, unknown> = { url: input.url };
    if (Object.keys(settings).length > 0) body.settings = settings;
    if (input.remove_expiration !== undefined) {
      body.remove_expiration = input.remove_expiration;
    }

    const res = await ctx.fetch(
      `${API_BASE}/2/sharing/modify_shared_link_settings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = await readDropbox("modifySharedLinkSettings", res);
    return mapSharedLink(data);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
