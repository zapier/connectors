#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  apiArgHeader,
  CONTENT_BASE,
  NAMESPACE_ID_DESCRIBE,
  pathRootHeader,
  throwIfDropboxError,
} from "../lib/dropbox.ts";

// files/download is a content endpoint — the JSON args ride in the Dropbox-API-Arg
// request header, the file bytes come back in the response body, and the file metadata
// comes back in the Dropbox-API-Result response header. Returns inline TEXT for UTF-8
// files within max_bytes; binary/oversized files point the agent at getTemporaryLink.

const inputSchema = z
  .object({
    path: z
      .string()
      .describe(
        "Path or id of the file to read, e.g. /Notes/todo.txt or id:abc123. Folders are not supported.",
      ),
    max_bytes: z
      .number()
      .int()
      .min(1)
      .default(1_000_000)
      .describe(
        "Cap on how many bytes to read inline (protects the agent's context). Defaults to 1,000,000 (~1 MB). Larger files come back truncated; use getTemporaryLink for the full bytes.",
      ),
    namespace_id: z.string().describe(NAMESPACE_ID_DESCRIBE).optional(),
  })
  .strict();

const outputSchema = z.object({
  name: z.string().describe("The file's name."),
  path_display: z.string().describe("Path with original casing.").optional(),
  rev: z.string().describe("Revision id of the content read.").optional(),
  size: z.number().int().describe("Full file size in bytes.").optional(),
  content: z
    .string()
    .describe(
      "The file's text content (UTF-8). Empty/explanatory when the file is binary or non-text — use getTemporaryLink for those.",
    ),
  truncated: z
    .boolean()
    .describe(
      "True if the file exceeded max_bytes and only the leading slice is returned.",
    ),
  is_text: z
    .boolean()
    .describe(
      "True if the bytes decoded as UTF-8 text; false for binary/non-text files.",
    ),
});

const definition = defineTool({
  name: "getFileContents",
  title: "Get File Contents",
  description:
    "Read the inline text content of a text file (UTF-8, size-capped). For binary or oversized files (PDFs, images, large docs) it returns is_text:false / truncated:true and points you to getTemporaryLink for the bytes. Does not OCR or parse documents.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "dropbox",
  run: async (input, ctx) => {
    const res = await ctx.fetch(`${CONTENT_BASE}/2/files/download`, {
      method: "POST",
      headers: {
        "Dropbox-API-Arg": apiArgHeader({ path: input.path }),
        ...pathRootHeader(input.namespace_id),
      },
    });
    await throwIfDropboxError("getFileContents", res);

    const meta = JSON.parse(res.headers.get("Dropbox-API-Result") ?? "{}") as {
      name?: string;
      path_display?: string;
      rev?: string;
      size?: number;
    };
    const all = new Uint8Array(await res.arrayBuffer());
    const truncated = all.byteLength > input.max_bytes;
    const slice = truncated ? all.subarray(0, input.max_bytes) : all;
    // NUL-byte heuristic: a text file has no NUL bytes in the inspected slice. This
    // avoids false negatives from a multibyte UTF-8 char cut at the truncation boundary.
    const is_text = !slice.includes(0);
    const content = is_text
      ? new TextDecoder("utf-8").decode(slice)
      : "This file is not UTF-8 text (binary or unsupported encoding); use getTemporaryLink to download the bytes.";

    return {
      name: meta.name ?? "",
      path_display: meta.path_display,
      rev: meta.rev,
      size: meta.size ?? all.byteLength,
      content,
      truncated,
      is_text,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
