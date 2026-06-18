#!/usr/bin/env node
// Authored by the implementation agent: export is a Drive operation
// (files.export on www.googleapis.com), not the Docs host codegen scaffolds
// against. It returns the rendered content as a string.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { DRIVE_BASE } from "../lib/constants.ts";
import { googleDocsFetch } from "../lib/googleDocsFetch.ts";

// Drive's files.export supports text/plain and text/markdown for a Google Doc;
// HTML export is offered only as application/zip (a zipped Web Page bundle), so
// there is no text/html option that returns a usable string.
const MIME_FOR_FORMAT = {
  text: "text/plain",
  markdown: "text/markdown",
} as const;

const inputSchema = z
  .object({
    documentId: z.string().describe("Document id to export."),
    format: z
      .enum(["text", "markdown"])
      .describe(
        "Export format: text (text/plain) or markdown (text/markdown). markdown is the most usable for reading a whole document. Defaults to text.",
      )
      .default("text"),
  })
  .strict();

const outputSchema = z.object({
  documentId: z.string().describe("The exported document id."),
  format: z
    .enum(["text", "markdown"])
    .describe("The format the content was exported in."),
  content: z.string().describe("The exported document content."),
});

const definition = defineTool({
  name: "exportDocument",
  title: "Export Document",
  description:
    "Export a document as plain text or Markdown. Prefer markdown for reading or summarizing a whole document — it's far more usable than getDocument's structural JSON. Export loses index information, so use getDocument/findText when the next step is an index-based edit.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-docs",
  run: async (input, ctx) => {
    const url = new URL(
      `${DRIVE_BASE}/files/${encodeURIComponent(input.documentId)}/export`,
    );
    url.searchParams.set("mimeType", MIME_FOR_FORMAT[input.format]);
    const res = await googleDocsFetch(
      ctx.fetch,
      url.toString(),
      { method: "GET" },
      "exportDocument",
    );
    const content = await res.text();
    return { documentId: input.documentId, format: input.format, content };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
