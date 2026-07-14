#!/usr/bin/env node
// Authored by the implementation agent: multipart file upload or URL form POST to
// POST /cards/{id}/attachments — outside codegen's single JSON-call model.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  TRELLO_BASE,
  TRELLO_ID_REGEX,
  trelloError,
  trelloFormBody,
  trelloFormHeaders,
} from "../lib/trello.ts";

const inputSchema = z
  .object({
    id: z.string().describe("24-char hex card id."),
    url: z
      .string()
      .url()
      .describe(
        "URL to attach (link attachment). Mutually exclusive with fileUrl.",
      )
      .optional(),
    fileUrl: z
      .string()
      .url()
      .describe(
        "Remote file URL to download and upload. Mutually exclusive with url.",
      )
      .optional(),
    name: z.string().describe("Attachment display name.").optional(),
    mimeType: z.string().optional(),
  })
  .strict()
  .refine((v) => (v.url ? !v.fileUrl : !!v.fileUrl), {
    message: "Provide exactly one of url or fileUrl.",
  });

const outputSchema = z.object({
  id: z.string().regex(TRELLO_ID_REGEX),
  name: z.string(),
  url: z.string(),
  mimeType: z.string().nullable().optional(),
  bytes: z.number().nullable().optional(),
  isUpload: z.boolean().nullable().optional(),
});

const definition = defineTool({
  name: "addCardAttachment",
  title: "Add Card Attachment",
  description:
    "Add a URL link attachment or upload a file from a remote URL to a card. Provide url OR fileUrl, not both.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "trello",
  run: async (input, ctx) => {
    const cardPath = `${TRELLO_BASE}/cards/${encodeURIComponent(input.id)}/attachments`;

    if (input.fileUrl) {
      const fileRes = await ctx.fetch(input.fileUrl);
      if (!fileRes.ok) await trelloError("addCardAttachment", fileRes);
      const buffer = await fileRes.arrayBuffer();
      const fileName = input.name ?? "attachment";
      const form = new FormData();
      form.append(
        "file",
        new Blob([buffer], {
          type:
            input.mimeType ?? fileRes.headers.get("content-type") ?? undefined,
        }),
        fileName,
      );
      form.append("name", fileName);
      if (input.mimeType) form.append("mimeType", input.mimeType);
      const uploadRes = await ctx.fetch(cardPath, {
        method: "POST",
        body: form,
      });
      if (!uploadRes.ok) await trelloError("addCardAttachment", uploadRes);
      return uploadRes.json() as Promise<z.infer<typeof outputSchema>>;
    }

    const linkRes = await ctx.fetch(cardPath, {
      method: "POST",
      headers: trelloFormHeaders,
      body: trelloFormBody({
        url: input.url!,
        name: input.name ?? input.url!,
        mimeType: input.mimeType,
      }),
    });
    if (!linkRes.ok) await trelloError("addCardAttachment", linkRes);
    return linkRes.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
