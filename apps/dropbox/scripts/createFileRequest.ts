#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { API_BASE, fileRequestSchema, readDropbox } from "../lib/dropbox.ts";

const inputSchema = z
  .object({
    title: z
      .string()
      .describe('Title shown on the upload page, e.g. "Submit your headshot".'),
    destination: z
      .string()
      .describe(
        "Folder path where uploads land, e.g. /FileRequests/Headshots. Must be an existing folder path.",
      ),
    description: z
      .string()
      .describe("Optional instructions shown to uploaders on the request page.")
      .optional(),
    deadline: z
      .string()
      .datetime({ offset: true })
      .describe(
        "Optional ISO-8601 cutoff for uploads. Deadlines require a paid Dropbox plan.",
      )
      .optional(),
    open: z
      .boolean()
      .describe(
        "Whether the request accepts uploads. Default true; set false to create it closed.",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "createFileRequest",
  title: "Create File Request",
  description:
    "Create a file request — a public upload page that lets anyone upload files into a folder in your Dropbox without a Dropbox account.",
  inputSchema,
  outputSchema: fileRequestSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "dropbox",
  run: async (input, ctx) => {
    const body: Record<string, unknown> = {
      title: input.title,
      destination: input.destination,
      description: input.description,
      open: input.open ?? true,
    };
    // `deadline` wraps into the FileRequestDeadline struct; a Basic account setting
    // one gets invalid_account_type (lib's error mapper hints "requires a paid plan").
    if (input.deadline !== undefined) {
      body.deadline = { deadline: input.deadline };
    }
    const res = await ctx.fetch(`${API_BASE}/2/file_requests/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // The response is a plain FileRequest object (no .tag) — return it directly.
    const data = await readDropbox("createFileRequest", res);
    return data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
