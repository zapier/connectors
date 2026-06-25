#!/usr/bin/env node
// This is a read-modify-write composition, not a single HTTP call. videos.update
// REPLACES every field
// within a written part — any mutable snippet/status field omitted from the request
// is reset to its default. So "change just the title" must first read the current
// snippet+status, merge the agent's changes onto it, then PUT the full object back.
// The API also requires snippet.title and snippet.categoryId on every update, so the
// merge carries those forward when the agent doesn't supply them.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForYouTube, VideoSchema } from "../lib/youtube.ts";

const inputSchema = z
  .object({
    video_id: z
      .string()
      .describe("The id of the video to update (you must own it)."),
    title: z.string().describe("New title. Max 100 characters.").optional(),
    description: z.string().describe("New description.").optional(),
    tags: z
      .array(z.string())
      .describe("New tag list (replaces the existing tags).")
      .optional(),
    category_id: z
      .string()
      .describe("New category id (from listVideoCategories).")
      .optional(),
    privacy_status: z
      .enum(["private", "public", "unlisted"])
      .describe("New privacy status.")
      .optional(),
    publish_at: z
      .string()
      .describe(
        "Reschedule publication (RFC3339). Requires privacy_status=private.",
      )
      .optional(),
    made_for_kids: z
      .boolean()
      .describe("COPPA self-declaration (status.selfDeclaredMadeForKids).")
      .optional(),
  })
  .strict();

const outputSchema = VideoSchema;

interface VideoSnippet {
  title?: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  defaultLanguage?: string;
  [k: string]: unknown;
}
interface VideoStatus {
  privacyStatus?: string;
  publishAt?: string;
  selfDeclaredMadeForKids?: boolean;
  license?: string;
  embeddable?: boolean;
  publicStatsViewable?: boolean;
  [k: string]: unknown;
}

const definition = defineTool({
  name: "updateVideo",
  title: "Update Video",
  description:
    "Update an existing video's metadata (title, description, tags, category, privacy) without disturbing the fields you don't change. Reads the current video first, merges your changes, then writes — so omitting a field leaves it as-is. You must own the video.",
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
    // 1. Read the current snippet + status.
    const getUrl = new URL(`https://www.googleapis.com/youtube/v3/videos`);
    getUrl.searchParams.set("part", "snippet,status");
    getUrl.searchParams.set("id", input.video_id);
    const getRes = await ctx.fetch(getUrl.toString(), { method: "GET" });
    await throwForYouTube(getRes, "updateVideo");
    const current = (await getRes.json()) as {
      items?: Array<{ snippet?: VideoSnippet; status?: VideoStatus }>;
    };
    const video = current.items?.[0];
    if (!video) {
      throw new Error(
        `YouTube updateVideo 404: no video found with id '${input.video_id}'. Verify the id (resolve via searchVideos/getVideo); you can only update videos you own.`,
      );
    }

    // 2. Merge the provided fields onto the current snippet/status. The API requires
    //    snippet.title and snippet.categoryId on update — carried forward from the
    //    current video unless the agent overrides them. Only writable fields are sent.
    const cur = video.snippet ?? {};
    const snippet: VideoSnippet = {
      title: input.title ?? cur.title,
      categoryId: input.category_id ?? cur.categoryId,
    };
    if (input.description !== undefined)
      snippet.description = input.description;
    else if (cur.description !== undefined)
      snippet.description = cur.description;
    if (input.tags !== undefined) snippet.tags = input.tags;
    else if (cur.tags !== undefined) snippet.tags = cur.tags;
    if (cur.defaultLanguage !== undefined)
      snippet.defaultLanguage = cur.defaultLanguage;

    const curStatus = video.status ?? {};
    const status: VideoStatus = {
      privacyStatus: input.privacy_status ?? curStatus.privacyStatus,
    };
    if (input.publish_at !== undefined) status.publishAt = input.publish_at;
    else if (curStatus.publishAt !== undefined)
      status.publishAt = curStatus.publishAt;
    if (input.made_for_kids !== undefined)
      status.selfDeclaredMadeForKids = input.made_for_kids;
    else if (curStatus.selfDeclaredMadeForKids !== undefined)
      status.selfDeclaredMadeForKids = curStatus.selfDeclaredMadeForKids;
    if (curStatus.license !== undefined) status.license = curStatus.license;

    // 3. Write the full merged object back.
    const putUrl = new URL(`https://www.googleapis.com/youtube/v3/videos`);
    putUrl.searchParams.set("part", "snippet,status");
    const putRes = await ctx.fetch(putUrl.toString(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: input.video_id, snippet, status }),
    });
    await throwForYouTube(putRes, "updateVideo");
    return putRes.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
