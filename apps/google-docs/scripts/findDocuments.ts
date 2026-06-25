#!/usr/bin/env node
// The Docs API has no list/search endpoint — finding documents routes to the Drive
// API (www.googleapis.com) with mimeType filtering on Google Docs files.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { DRIVE_BASE, GOOGLE_DOC_MIME } from "../lib/constants.ts";
import { googleDocsFetch } from "../lib/googleDocsFetch.ts";

const inputSchema = z
  .object({
    name: z
      .string()
      .describe(
        "Substring to match against document titles. Omit to list all documents (optionally within folder).",
      )
      .optional(),
    folder: z
      .string()
      .describe("Drive folder id to scope the search to.")
      .optional(),
    limit: z
      .number()
      .int()
      .describe(
        "Max documents to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .default(20),
    pageToken: z
      .string()
      .describe("Cursor from a previous response's nextPageToken.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  documents: z.array(
    z.object({
      documentId: z.string().describe("Document id — pass to getDocument etc."),
      title: z.string().describe("The document title."),
      url: z.string().describe("The document's view URL (webViewLink)."),
      modifiedTime: z.string().describe("Last-modified time (RFC3339)."),
      createdTime: z.string().describe("Creation time (RFC3339)."),
    }),
  ),
  nextPageToken: z
    .string()
    .describe("Pass as pageToken for the next page; absent when no more.")
    .optional(),
});

interface DriveFile {
  id?: string;
  name?: string;
  webViewLink?: string;
  modifiedTime?: string;
  createdTime?: string;
}
interface DriveListResponse {
  files?: DriveFile[];
  nextPageToken?: string;
}

/**
 * Escape a value for the Drive `q` string-literal grammar. Backslash must be
 * escaped first (to `\\`), then the single quote (to `\'`) — doing it in the
 * other order would double-escape the backslashes just added.
 */
function q(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

const definition = defineTool({
  name: "findDocuments",
  title: "Find Documents",
  description:
    "Find Google Docs documents by name and/or folder — the primary way to resolve a document title (or folder) to the id every other tool needs. Returns id, title, URL, and timestamps.",
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
    const clauses = [`mimeType = '${GOOGLE_DOC_MIME}'`, "trashed = false"];
    if (input.name) clauses.push(`name contains '${q(input.name)}'`);
    if (input.folder) clauses.push(`'${q(input.folder)}' in parents`);

    const url = new URL(`${DRIVE_BASE}/files`);
    url.searchParams.set("q", clauses.join(" and "));
    url.searchParams.set("pageSize", String(input.limit));
    url.searchParams.set(
      "fields",
      "nextPageToken,files(id,name,webViewLink,modifiedTime,createdTime)",
    );
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    if (input.pageToken) url.searchParams.set("pageToken", input.pageToken);

    const res = await googleDocsFetch(
      ctx.fetch,
      url.toString(),
      { method: "GET" },
      "findDocuments",
    );
    const json = (await res.json()) as DriveListResponse;

    return {
      documents: (json.files ?? []).map((f) => ({
        documentId: f.id ?? "",
        title: f.name ?? "",
        url: f.webViewLink ?? "",
        modifiedTime: f.modifiedTime ?? "",
        createdTime: f.createdTime ?? "",
      })),
      nextPageToken: json.nextPageToken,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
