#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z
  .object({
    issueId: z
      .string()
      .describe(
        'The issue to attach to, as its UUID or human identifier (e.g. "ENG-118"). Both are accepted.',
      ),
    url: z
      .string()
      .describe(
        "The link (URL) to attach — e.g. a related ticket, doc, or PR.",
      ),
    title: z.string().describe("Display title for the attachment.").optional(),
    subtitle: z
      .string()
      .describe("Secondary text for the attachment.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z.uuid().describe("The attachment's UUID."),
  url: z.string().describe("The attached link."),
  title: z.string().describe("The attachment's display title.").optional(),
});

const CREATE_ATTACHMENT = `
mutation AttachmentCreate($input: AttachmentCreateInput!) {
  attachmentCreate(input: $input) {
    success
    attachment { id url title }
  }
}`;

const definition = defineTool({
  name: "createAttachment",
  title: "Create Attachment",
  description:
    "Attach a link (URL) to a Linear issue — e.g. a related ticket, doc, or PR. Linear attachments are link-based, not file uploads.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "linear",
  run: async (input, ctx) => {
    // Build AttachmentCreateInput from only the fields the caller set.
    const inputPayload: Record<string, unknown> = {
      issueId: input.issueId,
      url: input.url,
    };
    if (input.title !== undefined) inputPayload.title = input.title;
    if (input.subtitle !== undefined) inputPayload.subtitle = input.subtitle;

    const data = await linearGraphql<{
      attachmentCreate: { attachment: z.infer<typeof outputSchema> };
    }>(ctx.fetch, CREATE_ATTACHMENT, { input: inputPayload });
    return data.attachmentCreate.attachment;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
