#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  apiArgHeader,
  CONTENT_BASE,
  entrySchema,
  mapEntry,
  NAMESPACE_ID_DESCRIBE,
  pathRootHeader,
  readDropbox,
  tagged,
  throwIfDropboxError,
} from "../lib/dropbox.ts";

// files/upload is a content endpoint (JSON args in the Dropbox-API-Arg header, raw bytes
// in the body). The connector fetches the bytes from a URL, then picks the single-request
// path (≤150 MiB) or a chunked upload session (>150 MiB; chunks must be 4 MiB multiples,
// last chunk closes the session).

const SINGLE_REQUEST_LIMIT = 150 * 1024 * 1024; // 150 MiB — Dropbox's single-upload ceiling.
const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MiB — a 4 MiB multiple, as upload sessions require.

const inputSchema = z
  .object({
    file_url: z
      .string()
      .url()
      .describe("URL the connector downloads the file bytes from."),
    path: z
      .string()
      .describe(
        "Destination path including the filename, e.g. /Uploads/photo.jpg. Must start with a slash.",
      ),
    mode: z
      .enum(["add", "overwrite"])
      .default("add")
      .describe(
        "add keeps both files on a name conflict (unless autorename); overwrite replaces the existing file. Default add.",
      ),
    autorename: z
      .boolean()
      .default(false)
      .describe(
        "On a name conflict in add mode, save as a numbered variant instead of failing. Default false.",
      ),
    namespace_id: z.string().describe(NAMESPACE_ID_DESCRIBE).optional(),
  })
  .strict();

const definition = defineTool({
  name: "uploadFile",
  title: "Upload File",
  description:
    "Upload a file to Dropbox by fetching its bytes from a URL. Handles large files via a chunked upload session automatically. To write plain text directly (no URL), use createTextFile instead.",
  inputSchema,
  outputSchema: entrySchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "dropbox",
  run: async (input, ctx) => {
    // Step 1: download the bytes from the caller-provided URL. NOT a Dropbox call —
    // use global fetch so Dropbox credentials are never sent to a third-party host.
    const srcRes = await globalThis.fetch(input.file_url);
    if (!srcRes.ok) {
      throw new Error(
        `Dropbox uploadFile: could not download file_url (${srcRes.status}).`,
      );
    }
    const bytes = new Uint8Array(await srcRes.arrayBuffer());

    const commit = {
      path: input.path,
      mode: tagged(input.mode),
      autorename: input.autorename,
    };
    const pathRoot = pathRootHeader(input.namespace_id);

    let data: Record<string, unknown>;
    if (bytes.byteLength <= SINGLE_REQUEST_LIMIT) {
      // Single-request upload.
      const res = await ctx.fetch(`${CONTENT_BASE}/2/files/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": apiArgHeader(commit),
          ...pathRoot,
        },
        body: bytes,
      });
      data = await readDropbox("uploadFile", res);
    } else {
      // Chunked upload session: start with the first chunk, append the middle chunks,
      // then finish with the remaining bytes + the commit info.
      const startRes = await ctx.fetch(
        `${CONTENT_BASE}/2/files/upload_session/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": apiArgHeader({}),
          },
          body: bytes.subarray(0, CHUNK_SIZE),
        },
      );
      const { session_id } = await readDropbox<{ session_id: string }>(
        "uploadFile",
        startRes,
      );

      let offset = CHUNK_SIZE;
      while (bytes.byteLength - offset > CHUNK_SIZE) {
        const appendRes = await ctx.fetch(
          `${CONTENT_BASE}/2/files/upload_session/append_v2`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Dropbox-API-Arg": apiArgHeader({
                cursor: { session_id, offset },
                close: false,
              }),
            },
            body: bytes.subarray(offset, offset + CHUNK_SIZE),
          },
        );
        // append_v2 returns an empty body on success — check status only.
        await throwIfDropboxError("uploadFile", appendRes);
        offset += CHUNK_SIZE;
      }

      const finishRes = await ctx.fetch(
        `${CONTENT_BASE}/2/files/upload_session/finish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": apiArgHeader({
              cursor: { session_id, offset },
              commit,
            }),
            ...pathRoot,
          },
          body: bytes.subarray(offset),
        },
      );
      data = await readDropbox("uploadFile", finishRes);
    }

    return mapEntry(data);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
