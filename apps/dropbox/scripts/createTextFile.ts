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
} from "../lib/dropbox.ts";

// files/upload is a content endpoint — JSON args in the Dropbox-API-Arg header, the raw
// bytes in the body. This tool writes plain text directly (no URL fetch); see uploadFile
// for fetching bytes from a URL.

const inputSchema = z
  .object({
    path: z
      .string()
      .describe(
        "Destination path including the filename, e.g. /Notes/todo.txt. Must start with a slash.",
      ),
    content: z.string().describe("The text content to write to the file."),
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
  name: "createTextFile",
  title: "Create Text File",
  description:
    "Create (or overwrite) a Dropbox file from plain text content — e.g. save a summary, CSV, or Markdown note. Pairs with appendToTextFile for incremental writes. To upload bytes from a URL use uploadFile instead.",
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
    const apiArg = {
      path: input.path,
      mode: tagged(input.mode),
      autorename: input.autorename,
    };
    const res = await ctx.fetch(`${CONTENT_BASE}/2/files/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": apiArgHeader(apiArg),
        ...pathRootHeader(input.namespace_id),
      },
      body: input.content,
    });
    const data = await readDropbox("createTextFile", res);
    return mapEntry(data);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
