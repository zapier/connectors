#!/usr/bin/env node
import {
  ConnectorHttpError,
  defineTool,
  handleIfScriptMain,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  CommentSchema,
  hasYouTubeReason,
  throwForYouTube,
} from "../lib/youtube.ts";

const inputSchema = z
  .object({
    snippet: z
      .object({
        parentId: z
          .string()
          .describe(
            "The TOP-LEVEL comment thread id to reply to (from listComments) — not a reply id. Replies are single-level: you cannot reply to a reply.",
          ),
        textOriginal: z.string().describe("The reply text to post."),
      })
      .strict(),
    part: z
      .string()
      .describe("Resource parts being written. Leave as the default.")
      .default("snippet"),
  })
  .strict();
const outputSchema = CommentSchema;

const definition = defineTool({
  name: "replyToComment",
  title: "Reply To Comment",
  description:
    "Reply to an existing top-level comment thread. The parentId must be a top-level comment thread id from listComments — replies are single-level, so you cannot reply to a reply (YouTube rejects it with operationNotSupported). Requires the youtube.force-ssl scope.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "youtube",
  run: async (input, ctx) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/comments`);
    if (input.part !== undefined) {
      url.searchParams.set("part", String(input.part));
    }
    const body: Record<string, unknown> = {};
    if (input.snippet !== undefined) body["snippet"] = input.snippet;
    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();

    // Replies are single-level: passing a reply's id as parentId (instead of a
    // top-level thread id) is rejected with operationNotSupported. Translate it
    // into actionable guidance rather than surfacing the raw upstream reason.
    if (res.status === 400) {
      const errBody = (await res.json().catch(() => null)) as unknown;
      if (hasYouTubeReason(errBody, "operationNotSupported")) {
        throw ConnectorHttpError.fromResponseBody(res, errBody, {
          message:
            "YouTube replyToComment 400: operationNotSupported — parentId must be a top-level comment thread id (from listComments), not a reply. YouTube does not support nested replies.",
        });
      }
      throw ConnectorHttpError.fromResponseBody(res, errBody, {
        message: `YouTube replyToComment 400: ${
          (errBody as { error?: { message?: string } })?.error?.message ??
          "bad request"
        }`,
      });
    }

    await throwForYouTube(res, "replyToComment");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
