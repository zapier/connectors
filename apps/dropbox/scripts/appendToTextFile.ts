#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  API_BASE,
  apiArgHeader,
  CONTENT_BASE,
  DropboxApiError,
  NAMESPACE_ID_DESCRIBE,
  pathRootHeader,
  readDropbox,
  tagged,
  throwIfDropboxError,
} from "../lib/dropbox.ts";

// Hand-authored read-modify-write: Dropbox has no native append. We read the current
// metadata (for the rev), download the existing bytes, concatenate a newline + the new
// text, and re-upload with mode update=<rev> (optimistic concurrency). If the file
// doesn't exist yet, we create it (was_created: true).

const inputSchema = z
  .object({
    path: z
      .string()
      .describe(
        "Path of the text file to append to, e.g. /Logs/run.log. Created if it doesn't exist.",
      ),
    content: z
      .string()
      .describe(
        "Text to append. A newline is inserted before it when the file already has content.",
      ),
    namespace_id: z.string().describe(NAMESPACE_ID_DESCRIBE).optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  path_display: z.string().optional(),
  rev: z.string().describe("Revision id of the new content.").optional(),
  size: z.number().int().describe("New file size in bytes.").optional(),
  server_modified: z
    .string()
    .describe("ISO-8601 time Dropbox received the write.")
    .optional(),
  was_created: z
    .boolean()
    .describe("True if the file did not exist and was created by this call."),
});

const definition = defineTool({
  name: "appendToTextFile",
  title: "Append to Text File",
  description:
    "Append text to an existing Dropbox text file (e.g. add a line to a running log), creating the file if it doesn't exist. Reads the current content and re-uploads — for a fresh file or a full replacement, use createTextFile.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "dropbox",
  run: async (input, ctx) => {
    const pathRoot = pathRootHeader(input.namespace_id);

    // 1. Look up current metadata to learn the rev (and whether the file exists).
    const metaRes = await ctx.fetch(`${API_BASE}/2/files/get_metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...pathRoot },
      body: JSON.stringify({ path: input.path }),
    });

    let existing = "";
    let rev: string | undefined;
    let wasCreated = false;
    if (metaRes.ok) {
      const meta = (await metaRes.json()) as { rev?: string };
      rev = meta.rev;
      // 2. Download the existing bytes so we can concatenate.
      const dlRes = await ctx.fetch(`${CONTENT_BASE}/2/files/download`, {
        method: "POST",
        headers: {
          "Dropbox-API-Arg": apiArgHeader({ path: input.path }),
          ...pathRoot,
        },
      });
      await throwIfDropboxError("appendToTextFile", dlRes);
      existing = new TextDecoder("utf-8").decode(await dlRes.arrayBuffer());
    } else {
      // Not-found is the create path; any other error is real.
      let summary = "";
      try {
        const body = JSON.parse(await metaRes.text()) as {
          error_summary?: unknown;
        };
        if (typeof body.error_summary === "string")
          summary = body.error_summary;
      } catch {
        // leave summary empty
      }
      if (summary.startsWith("path/not_found")) {
        wasCreated = true;
      } else {
        throw new DropboxApiError("appendToTextFile", metaRes.status, summary);
      }
    }

    // 3. Re-upload: create with add mode, or overwrite the known rev with update mode.
    const newContent = wasCreated
      ? input.content
      : `${existing}\n${input.content}`;
    const mode = wasCreated ? tagged("add") : { ".tag": "update", update: rev };
    const upRes = await ctx.fetch(`${CONTENT_BASE}/2/files/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": apiArgHeader({
          path: input.path,
          mode,
          autorename: false,
        }),
        ...pathRoot,
      },
      body: newContent,
    });
    const data = await readDropbox<{
      id?: string;
      name?: string;
      path_display?: string;
      rev?: string;
      size?: number;
      server_modified?: string;
    }>("appendToTextFile", upRes);

    return {
      id: data.id,
      name: data.name ?? "",
      path_display: data.path_display,
      rev: data.rev,
      size: data.size,
      server_modified: data.server_modified,
      was_created: wasCreated,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
