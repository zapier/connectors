#!/usr/bin/env node
// videos.insert uses the resumable upload protocol on the upload host — a two-step
// flow (POST the metadata with X-Upload-Content-* headers to open a session, read
// the session URI from the Location header, then PUT the bytes to it), so it's
// hand-rolled rather than a single JSON call. The source video (and optional
// thumbnail) are fetched from
// their URLs with globalThis.fetch so the YouTube bearer token is never sent to a
// third-party host; the upload-host calls go through the authed ctx.fetch.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForYouTube, VideoSchema } from "../lib/youtube.ts";

// The resumable-upload PUT (and the thumbnail PUT) send the file as a binary
// request body. The Zapier connection relay carries only string/JSON bodies, so
// `ctx.fetch` rejects a binary body there with a low-level SDK message. Translate
// that into an actionable error instead of leaking it: uploads must run over a
// direct token connection. See references/youtube-api-gotchas.md → Uploads.
const RELAY_BINARY_UNSUPPORTED =
  "YouTube uploadVideo streams the file as a binary request body, which the Zapier " +
  "connection relay does not support (it carries only string/JSON bodies). Uploading " +
  "over a `zapier:<id>` connection is therefore not possible — invoke uploadVideo with " +
  "a direct token connection (`env:YOUTUBE_TOKEN`, a `youtube.upload`-scoped OAuth " +
  "token) instead. See references/youtube-api-gotchas.md → Uploads.";

function rethrowUpload(err: unknown): never {
  if (
    err instanceof Error &&
    err.message.includes("only accepts `body: string`")
  ) {
    throw new Error(RELAY_BINARY_UNSUPPORTED, { cause: err });
  }
  throw err;
}

const inputSchema = z
  .object({
    video_url: z
      .string()
      .url()
      .describe(
        "URL of the video file to upload (fetched and streamed to YouTube).",
      ),
    title: z
      .string()
      .describe(
        "Video title (max 100 characters; cannot include invalid characters).",
      ),
    description: z.string().describe("Video description.").optional(),
    privacy_status: z
      .enum(["private", "public", "unlisted"])
      .describe("Video visibility. Defaults to private.")
      .default("private"),
    tags: z.array(z.string()).describe("Keyword tags.").optional(),
    category_id: z
      .string()
      .describe("Category id from listVideoCategories.")
      .optional(),
    publish_at: z
      .string()
      .describe(
        "Schedule publication (RFC3339). Requires privacy_status=private.",
      )
      .optional(),
    made_for_kids: z
      .boolean()
      .describe("COPPA self-declaration (status.selfDeclaredMadeForKids).")
      .optional(),
    notify_subscribers: z
      .boolean()
      .describe("Whether to notify subscribers. Defaults to true.")
      .default(true),
    thumbnail_url: z
      .string()
      .url()
      .describe("Optional custom thumbnail image URL (JPEG/PNG, <= 2 MB).")
      .optional(),
  })
  .strict()
  .refine((v) => v.publish_at === undefined || v.privacy_status === "private", {
    message: "publish_at requires privacy_status=private.",
    path: ["publish_at"],
  });

const outputSchema = VideoSchema.extend({
  watch_url: z.string().describe("Public watch URL for the uploaded video."),
  embed_url: z.string().describe("Embed URL for the uploaded video."),
});

const definition = defineTool({
  name: "uploadVideo",
  title: "Upload Video",
  description:
    "Upload a new video file (fetched from a URL) to the authenticated user's channel, with metadata (title, description, privacy, tags, category, scheduled publish, optional thumbnail). Metered against a separate Video Uploads quota bucket, not the main 10,000-unit pool. Requires the youtube.upload scope.",
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
    // Fetch the source video bytes from the (third-party) URL, unauthenticated.
    const srcRes = await globalThis.fetch(input.video_url);
    if (!srcRes.ok) {
      throw new Error(
        `YouTube uploadVideo: could not fetch video_url (${srcRes.status}). Provide a publicly reachable video file URL.`,
      );
    }
    const videoType =
      srcRes.headers.get("content-type") ?? "application/octet-stream";
    const bytes = new Uint8Array(await srcRes.arrayBuffer());

    const snippet: Record<string, unknown> = { title: input.title };
    if (input.description !== undefined)
      snippet.description = input.description;
    if (input.tags !== undefined) snippet.tags = input.tags;
    if (input.category_id !== undefined) snippet.categoryId = input.category_id;

    const status: Record<string, unknown> = {
      privacyStatus: input.privacy_status,
    };
    if (input.publish_at !== undefined) status.publishAt = input.publish_at;
    if (input.made_for_kids !== undefined)
      status.selfDeclaredMadeForKids = input.made_for_kids;

    // Step 1: open a resumable upload session.
    const sessionUrl = new URL(
      `https://www.googleapis.com/upload/youtube/v3/videos`,
    );
    sessionUrl.searchParams.set("uploadType", "resumable");
    sessionUrl.searchParams.set("part", "snippet,status");
    sessionUrl.searchParams.set(
      "notifySubscribers",
      String(input.notify_subscribers),
    );
    const sessionRes = await ctx.fetch(sessionUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": videoType,
        "X-Upload-Content-Length": String(bytes.byteLength),
      },
      body: JSON.stringify({ snippet, status }),
    });
    await throwForYouTube(sessionRes, "uploadVideo");
    const sessionUri = sessionRes.headers.get("location");
    if (!sessionUri) {
      throw new Error(
        "YouTube uploadVideo: the resumable session did not return an upload URI (Location header missing).",
      );
    }

    // Step 2: upload the bytes to the session URI.
    const uploadRes = await ctx
      .fetch(sessionUri, {
        method: "PUT",
        headers: { "Content-Type": videoType },
        body: bytes,
      })
      .catch(rethrowUpload);
    await throwForYouTube(uploadRes, "uploadVideo");
    const video = (await uploadRes.json()) as { id?: string } & Record<
      string,
      unknown
    >;

    // Optional: set a custom thumbnail after the upload.
    if (input.thumbnail_url !== undefined && video.id) {
      const imgRes = await globalThis.fetch(input.thumbnail_url);
      if (imgRes.ok) {
        const thumbUrl = new URL(
          `https://www.googleapis.com/upload/youtube/v3/thumbnails/set`,
        );
        thumbUrl.searchParams.set("videoId", video.id);
        thumbUrl.searchParams.set("uploadType", "media");
        const thumbRes = await ctx
          .fetch(thumbUrl.toString(), {
            method: "POST",
            headers: {
              "Content-Type":
                imgRes.headers.get("content-type") ??
                "application/octet-stream",
            },
            body: new Uint8Array(await imgRes.arrayBuffer()),
          })
          .catch(rethrowUpload);
        await throwForYouTube(thumbRes, "uploadVideo");
      }
    }

    const watch_url = video.id
      ? `https://www.youtube.com/watch?v=${video.id}`
      : "";
    const embed_url = video.id
      ? `https://www.youtube.com/embed/${video.id}`
      : "";
    return { ...video, watch_url, embed_url };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
