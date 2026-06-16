#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwForStatus,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { NOTION_VERSION, notionFetch } from "../lib/notionFetch.ts";

const inputSchema = z
  .object({
    file_url: z
      .string()
      .url()
      .describe(
        "Public URL of the file to upload. The connector fetches the bytes and sends them to Notion.",
      ),
    filename: z
      .string()
      .describe(
        "Filename to store (e.g. report.pdf). Defaults to the name derived from file_url.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z
    .string()
    .describe(
      "The file_upload id. Attach it via appendBlockChildren (a file/image block referencing { type: 'file_upload', file_upload: { id } }) or updatePage (a files property).",
    ),
  object: z.string().describe('Always "file_upload".'),
  status: z.string().describe('Upload status — "uploaded" on success.'),
  filename: z.string().nullable().optional().describe("The stored filename."),
});

const definition = defineTool({
  name: "uploadFile",
  title: "Upload File",
  description:
    "Upload a file from a public URL to Notion and return a file_upload id to attach to a page, block, or files property. Single-part upload only (up to 20 MB).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "notion",
  run: async (input, ctx) => {
    // 1. Fetch the source bytes from the provided URL.
    const srcRes = await ctx.fetch(input.file_url, { method: "GET" });
    if (!srcRes.ok) {
      throw new Error(
        `Notion uploadFile: failed to fetch file_url (${srcRes.status} ${srcRes.statusText}).`,
      );
    }
    const fileBlob = await srcRes.blob();
    const filename =
      input.filename ??
      decodeURIComponent(
        new URL(input.file_url).pathname.split("/").pop() || "upload",
      );

    // 2. Create the file_upload object (single-part mode is the default).
    const createRes = await notionFetch(
      ctx.fetch,
      "uploadFile",
      "https://api.notion.com/v1/file_uploads",
      { method: "POST", body: JSON.stringify({ filename }) },
    );
    const created = (await createRes.json()) as {
      id: string;
      upload_url: string;
    };

    // 3. Send the bytes to the returned upload URL as multipart form-data.
    //    Don't set Content-Type — fetch sets the multipart boundary itself.
    const form = new FormData();
    form.append("file", fileBlob, filename);
    const sendRes = await ctx.fetch(created.upload_url, {
      method: "POST",
      headers: { "Notion-Version": NOTION_VERSION },
      body: form,
    });
    await throwForStatus(sendRes, "Notion uploadFile (send)");
    return sendRes.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
