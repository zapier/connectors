#!/usr/bin/env node
// thumbnails.set is a binary upload on the upload host (raw image bytes +
// Content-Type, not a JSON requestBody), so it's hand-rolled rather than a single
// JSON call. The image is fetched from the given
// URL (unauthenticated — globalThis.fetch, so the YouTube bearer token is never sent
// to a third-party host) and streamed to the upload endpoint via the authed ctx.fetch.
import {
  ConnectorHttpError,
  defineTool,
  handleIfScriptMain,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  hasYouTubeReason,
  throwForYouTube,
  ThumbnailsSchema,
} from "../lib/youtube.ts";

const inputSchema = z
  .object({
    video_id: z
      .string()
      .describe("The id of the video to set the thumbnail on."),
    image_url: z
      .string()
      .url()
      .describe(
        "URL of a JPEG or PNG image to use as the thumbnail (<= 2 MB).",
      ),
  })
  .strict();

const outputSchema = z.object({
  items: z
    .array(ThumbnailsSchema)
    .describe("The thumbnail set now on the video, keyed by size."),
});

const definition = defineTool({
  name: "setVideoThumbnail",
  title: "Set Video Thumbnail",
  description:
    "Set or replace the custom thumbnail on a video from an image URL (JPEG or PNG, <= 2 MB). The account must have permission to upload custom thumbnails (the API returns a 403 'doesn't have permissions' error otherwise — in practice this requires a verified account). Requires the youtube.upload scope and ownership of the video.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "youtube",
  run: async (input, ctx) => {
    // Fetch the image bytes from the (third-party) URL without the YouTube auth header.
    const imgRes = await globalThis.fetch(input.image_url);
    if (!imgRes.ok) {
      throw new Error(
        `YouTube setVideoThumbnail: could not fetch image_url (${imgRes.status}). Provide a publicly reachable JPEG or PNG under 2 MB.`,
      );
    }
    const contentType =
      imgRes.headers.get("content-type") ?? "application/octet-stream";
    const bytes = new Uint8Array(await imgRes.arrayBuffer());

    const url = new URL(
      `https://www.googleapis.com/upload/youtube/v3/thumbnails/set`,
    );
    url.searchParams.set("videoId", input.video_id);
    url.searchParams.set("uploadType", "media");

    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: bytes,
    });
    if (res.ok) return res.json();

    // A 403 here has two distinct causes worth separating for the agent: a missing
    // youtube.upload scope (reconnect), versus the account simply not being permitted
    // to set custom thumbnails — observed in practice for unverified accounts, which
    // the API phrases as a plain "forbidden". The shared mapper's generic 403 text
    // doesn't mention the verification requirement, so handle 403 explicitly here.
    if (res.status === 403) {
      const errBody = (await res.json().catch(() => null)) as unknown;
      if (hasYouTubeReason(errBody, "insufficientPermissions")) {
        throw ConnectorHttpError.fromResponseBody(res, errBody, {
          message:
            "YouTube setVideoThumbnail 403: insufficientPermissions — the connection lacks the youtube.upload scope. Reconnect YouTube with upload access.",
        });
      }
      throw ConnectorHttpError.fromResponseBody(res, errBody, {
        message:
          "YouTube setVideoThumbnail 403: forbidden — this account isn't permitted to set a custom thumbnail. Custom thumbnails require a verified YouTube account (verify at youtube.com/verify) and ownership of the video.",
      });
    }

    await throwForYouTube(res, "setVideoThumbnail");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
