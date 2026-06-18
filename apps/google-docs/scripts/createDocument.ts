#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate, withReadinessRetry } from "../lib/batchUpdate.ts";
import {
  DOCS_BASE,
  documentUrl,
  DRIVE_BASE,
  GOOGLE_DOC_MIME,
} from "../lib/constants.ts";
import { googleDocsFetch } from "../lib/googleDocsFetch.ts";
import { renderMarkdownRequests } from "../lib/markdown.ts";
import { locationOf } from "../lib/range.ts";

// documents.create honors ONLY the title — any body sent is ignored. So initial
// `text` is a follow-up batchUpdate (InsertText at index 1, or a rendered
// Markdown batch), and `folder` placement is a Drive files.create (the Docs
// create cannot set a parent; docs otherwise land in My Drive root). The
// create-then-edit follow-up retries through post-create eventual consistency.

const inputSchema = z
  .object({
    title: z.string().describe("The document title."),
    text: z
      .string()
      .describe(
        "Optional initial body text, inserted after creation. Plain text unless markdown is true.",
      )
      .optional(),
    markdown: z
      .boolean()
      .describe(
        "When true, `text` is rendered as Markdown: headings (#..######), bold/italic, links, and bulleted/numbered lists become real formatting. Unsupported Markdown (tables, images, code fences) is inserted as literal text. Defaults to false (plain text).",
      )
      .default(false),
    folder: z
      .string()
      .describe(
        "Optional Drive folder id to create the document in. Omit to create in the connected user's Drive root. Resolve folder ids with findDocuments.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  documentId: z
    .string()
    .describe("The new document id (use in every other tool)."),
  title: z.string().describe("The document title."),
  revisionId: z
    .string()
    .describe("The document's revision id (omitted on folder-placed creates).")
    .optional(),
  url: z.string().describe("The document's edit URL in the Google Docs app."),
});

interface DocsCreateResponse {
  documentId?: string;
  title?: string;
  revisionId?: string;
}
interface DriveCreateResponse {
  id?: string;
  name?: string;
}

const definition = defineTool({
  name: "createDocument",
  title: "Create Document",
  description:
    "Create a new Google Doc, optionally with initial text (plain or Markdown) and in a specific Drive folder. Returns the documentId every other tool needs. Resolve a folder id with findDocuments.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-docs",
  run: async (input, ctx) => {
    let documentId: string;
    let revisionId: string | undefined;

    if (input.folder) {
      // Folder placement requires Drive — documents.create cannot set a parent.
      const res = await googleDocsFetch(
        ctx.fetch,
        `${DRIVE_BASE}/files?supportsAllDrives=true`,
        {
          method: "POST",
          body: JSON.stringify({
            name: input.title,
            mimeType: GOOGLE_DOC_MIME,
            parents: [input.folder],
          }),
        },
        "createDocument",
      );
      const created = (await res.json()) as DriveCreateResponse;
      if (!created.id) {
        throw new Error(
          "Google Docs createDocument: Drive did not return a file id for the created document.",
        );
      }
      documentId = created.id;
    } else {
      const res = await googleDocsFetch(
        ctx.fetch,
        `${DOCS_BASE}/documents`,
        { method: "POST", body: JSON.stringify({ title: input.title }) },
        "createDocument",
      );
      const created = (await res.json()) as DocsCreateResponse;
      if (!created.documentId) {
        throw new Error(
          "Google Docs createDocument: the API did not return a documentId.",
        );
      }
      documentId = created.documentId;
      revisionId = created.revisionId;
    }

    // Apply initial text via a follow-up batchUpdate (the create ignores body).
    if (input.text !== undefined && input.text.length > 0) {
      const requests = input.markdown
        ? renderMarkdownRequests(input.text, 1)
        : [{ insertText: { text: input.text, location: locationOf(1) } }];
      await withReadinessRetry(() =>
        batchUpdate(ctx.fetch, documentId, requests, "createDocument"),
      );
    }

    return {
      documentId,
      title: input.title,
      revisionId,
      url: documentUrl(documentId),
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
