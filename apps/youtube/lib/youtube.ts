// Shared YouTube Data API schemas and error mapping.
//
// YouTube partitions every resource into named "parts" (snippet / contentDetails /
// statistics / status / replies / resourceId). The same resource shapes are returned
// by both a list tool and the write tool that produces that resource (e.g. Video by
// getVideo + updateVideo + uploadVideo; Playlist by listPlaylists + createPlaylist +
// updatePlaylist), so the canonical output shapes live here and every tool imports
// them. Counts (viewCount/likeCount/subscriberCount/...) come back as STRINGS, not
// numbers — they are modeled as strings here; do not coerce. likeCount/commentCount
// are absent (not zero) when the owner has hidden them, and subscriberCount is
// suppressed when hiddenSubscriberCount is true.
//
// Every output schema is a plain z.object (strips unknown keys on parse), so a new
// API field is dropped rather than throwing. The error mapper is shared by all tools:
// Google returns the same `{ error: { code, message, errors:[{reason}] } }` body
// across the whole API, and the reason string is what tells an agent whether to
// reconnect, wait for quota reset, or ask for access.

import { ConnectorHttpError } from "@zapier/connectors-sdk";
import { z } from "zod";

// ---- shared sub-objects ----

/** Available thumbnail images, keyed by size (default, medium, high, standard, maxres). */
export const ThumbnailsSchema = z
  .record(
    z.string(),
    z.object({
      url: z.string().optional(),
      width: z.number().int().optional(),
      height: z.number().int().optional(),
    }),
  )
  .describe("Thumbnail images keyed by size (default, medium, high, ...).");

/** A pointer to another YouTube resource (used by playlist items and subscriptions). */
export const ResourceIdSchema = z.object({
  kind: z
    .string()
    .describe(
      "The referenced resource type, e.g. youtube#video or youtube#channel.",
    )
    .optional(),
  videoId: z.string().describe("Set when kind is youtube#video.").optional(),
  channelId: z
    .string()
    .describe("Set when kind is youtube#channel.")
    .optional(),
});

/** The pagination cursor every list tool returns under next_page_token. */
export const NextPageToken = z
  .string()
  .describe("Cursor for the next page; absent when there are no more results.")
  .nullable()
  .optional();

// ---- videos ----

/** The canonical YouTube Video resource (getVideo, updateVideo, uploadVideo). */
export const VideoSchema = z
  .object({
    id: z.string().describe("The 11-char video id."),
    snippet: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        channelId: z.string().optional(),
        channelTitle: z.string().optional(),
        publishedAt: z.string().optional(),
        tags: z.array(z.string()).optional(),
        categoryId: z.string().optional(),
        defaultLanguage: z.string().optional(),
        defaultAudioLanguage: z.string().optional(),
        liveBroadcastContent: z.string().optional(),
        thumbnails: ThumbnailsSchema.optional(),
      })
      .optional(),
    contentDetails: z
      .object({
        duration: z
          .string()
          .describe("ISO 8601 duration, e.g. PT4M13S (4 min 13 s).")
          .optional(),
        definition: z.string().describe("hd or sd.").optional(),
        caption: z
          .string()
          .describe(
            '"true" or "false" (string) — whether captions are available.',
          )
          .optional(),
        licensedContent: z.boolean().optional(),
      })
      .optional(),
    statistics: z
      .object({
        // Counts are returned as strings; likeCount/commentCount are absent when hidden.
        viewCount: z.string().optional(),
        likeCount: z.string().optional(),
        commentCount: z.string().optional(),
        favoriteCount: z.string().optional(),
      })
      .optional(),
    status: z
      .object({
        uploadStatus: z
          .string()
          .describe("uploaded, processed, failed, rejected, or deleted.")
          .optional(),
        privacyStatus: z
          .string()
          .describe("public, unlisted, or private.")
          .optional(),
        publishAt: z
          .string()
          .describe("Scheduled publish time, if a private scheduled upload.")
          .optional(),
        madeForKids: z.boolean().optional(),
        license: z.string().optional(),
      })
      .optional(),
  })
  .describe("A YouTube video resource.");

// ---- playlists ----

/** The canonical Playlist resource (listPlaylists, createPlaylist, updatePlaylist). */
export const PlaylistSchema = z
  .object({
    id: z
      .string()
      .describe(
        "The playlist id (PL...). Use with addVideoToPlaylist / listPlaylistItems.",
      ),
    snippet: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        channelId: z.string().optional(),
        channelTitle: z.string().optional(),
        publishedAt: z.string().optional(),
        thumbnails: ThumbnailsSchema.optional(),
      })
      .optional(),
    status: z
      .object({
        privacyStatus: z.string().optional(),
      })
      .optional(),
    contentDetails: z
      .object({
        itemCount: z
          .number()
          .int()
          .describe("Number of videos in the playlist.")
          .optional(),
      })
      .optional(),
  })
  .describe("A YouTube playlist resource.");

// ---- playlist items ----

/** The canonical PlaylistItem resource (listPlaylistItems, addVideoToPlaylist). */
export const PlaylistItemSchema = z
  .object({
    id: z
      .string()
      .describe(
        "The playlistItem id (use with removeVideoFromPlaylist — distinct from the video id).",
      ),
    snippet: z
      .object({
        playlistId: z.string().optional(),
        position: z.number().int().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        channelId: z.string().optional(),
        channelTitle: z.string().optional(),
        publishedAt: z.string().optional(),
        resourceId: ResourceIdSchema.optional(),
        thumbnails: ThumbnailsSchema.optional(),
      })
      .optional(),
    contentDetails: z
      .object({
        videoId: z.string().optional(),
        videoPublishedAt: z.string().optional(),
      })
      .optional(),
    status: z
      .object({
        privacyStatus: z.string().optional(),
      })
      .optional(),
  })
  .describe("A video entry within a playlist.");

// ---- comments ----

/** The canonical Comment resource (replyToComment, and embedded in CommentThread). */
export const CommentSchema = z
  .object({
    id: z.string().describe("The comment id."),
    snippet: z
      .object({
        textDisplay: z
          .string()
          .describe("The comment text as HTML (may contain links/formatting).")
          .optional(),
        textOriginal: z
          .string()
          .describe("The raw comment text as written.")
          .optional(),
        authorDisplayName: z.string().optional(),
        authorChannelId: z.object({ value: z.string().optional() }).optional(),
        likeCount: z.number().int().optional(),
        publishedAt: z.string().optional(),
        updatedAt: z.string().optional(),
        parentId: z
          .string()
          .describe(
            "For a reply, the id of the top-level comment it replies to.",
          )
          .optional(),
      })
      .optional(),
  })
  .describe("A YouTube comment.");

/** The canonical CommentThread resource (listComments, postComment). */
export const CommentThreadSchema = z
  .object({
    id: z
      .string()
      .describe("The comment thread id (use as parentId for replyToComment)."),
    snippet: z
      .object({
        videoId: z.string().optional(),
        totalReplyCount: z.number().int().optional(),
        isPublic: z.boolean().optional(),
        topLevelComment: CommentSchema.optional(),
      })
      .optional(),
    replies: z
      .object({
        comments: z.array(CommentSchema).optional(),
      })
      .describe(
        "A sample of replies (not exhaustive — page more via listComments).",
      )
      .optional(),
  })
  .describe("A top-level comment thread on a video.");

// ---- channels ----

/** The canonical Channel resource (getChannel). */
export const ChannelSchema = z
  .object({
    id: z.string().describe("The channel id (UC...)."),
    snippet: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        customUrl: z
          .string()
          .describe("The channel's @handle / custom URL.")
          .optional(),
        publishedAt: z.string().optional(),
        country: z.string().optional(),
        thumbnails: ThumbnailsSchema.optional(),
      })
      .optional(),
    contentDetails: z
      .object({
        relatedPlaylists: z
          .object({
            uploads: z
              .string()
              .describe(
                "The channel's uploads playlist id — pass to listPlaylistItems to list the channel's videos.",
              )
              .optional(),
            likes: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
    statistics: z
      .object({
        // Counts returned as strings; subscriberCount is suppressed when hiddenSubscriberCount is true.
        viewCount: z.string().optional(),
        subscriberCount: z.string().optional(),
        hiddenSubscriberCount: z.boolean().optional(),
        videoCount: z.string().optional(),
      })
      .optional(),
  })
  .describe("A YouTube channel resource.");

// ---- video categories ----

/** The canonical VideoCategory resource (listVideoCategories). */
export const VideoCategorySchema = z
  .object({
    id: z
      .string()
      .describe("The category id to pass as categoryId on a video."),
    snippet: z
      .object({
        title: z.string().optional(),
        assignable: z
          .boolean()
          .describe(
            "Whether the category can be assigned to a video. Only assignable categories are usable.",
          )
          .optional(),
      })
      .optional(),
  })
  .describe("An assignable video category.");

// ---- subscriptions ----

/** The canonical Subscription resource (listSubscriptions, subscribeToChannel). */
export const SubscriptionSchema = z
  .object({
    id: z
      .string()
      .describe(
        "The subscription id (use with unsubscribeFromChannel — distinct from the channel id).",
      ),
    snippet: z
      .object({
        title: z
          .string()
          .describe("The subscribed channel's title.")
          .optional(),
        description: z.string().optional(),
        publishedAt: z.string().optional(),
        resourceId: ResourceIdSchema.optional(),
        thumbnails: ThumbnailsSchema.optional(),
      })
      .optional(),
    contentDetails: z
      .object({
        totalItemCount: z.number().int().optional(),
        newItemCount: z.number().int().optional(),
      })
      .optional(),
  })
  .describe("A channel subscription.");

// ---- captions ----

/** The canonical Caption track resource (listCaptions). */
export const CaptionSchema = z
  .object({
    id: z.string().describe("The caption track id (use with downloadCaption)."),
    snippet: z
      .object({
        videoId: z.string().optional(),
        language: z
          .string()
          .describe("BCP-47 language code of the track, e.g. en.")
          .optional(),
        name: z.string().describe("The track name/label.").optional(),
        trackKind: z
          .string()
          .describe("standard, ASR (auto-generated), or forced.")
          .optional(),
        status: z.string().describe("serving, syncing, or failed.").optional(),
        isAutoSynced: z.boolean().optional(),
        lastUpdated: z.string().optional(),
      })
      .optional(),
  })
  .describe("A caption track on a video.");

// ---- search ----

/** A lightweight search hit (searchVideos). Call getVideo for statistics + duration. */
export const SearchResultSchema = z
  .object({
    id: z
      .object({
        kind: z.string().optional(),
        videoId: z.string().optional(),
        channelId: z.string().optional(),
        playlistId: z.string().optional(),
      })
      .describe("The matched resource id; id.videoId is the video.")
      .optional(),
    snippet: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        channelId: z.string().optional(),
        channelTitle: z.string().optional(),
        publishedAt: z.string().optional(),
        liveBroadcastContent: z
          .string()
          .describe("none, upcoming, or live.")
          .optional(),
        thumbnails: ThumbnailsSchema.optional(),
      })
      .optional(),
  })
  .describe("A lightweight search hit (id + snippet only).");

// ---- delete / rate result ----

/** Synthesized success for operations that return an empty body (delete, rate, unsubscribe). */
export const SuccessResultSchema = z
  .object({ success: z.literal(true) })
  .describe(
    "Result for an operation with an empty API body (delete/rate/unsubscribe). success is synthesized.",
  );

// ---- error mapping ----

const QUOTA_REASONS = new Set(["quotaExceeded", "dailyLimitExceeded"]);
const RATE_LIMIT_REASONS = new Set([
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "servingLimitExceeded",
]);

interface GoogleErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{ domain?: string; reason?: string; message?: string }>;
  };
}

async function readBody(res: Response): Promise<unknown> {
  let text: string;
  try {
    text = await res.text();
  } catch {
    return undefined;
  }
  if (text === "") return "";
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Throw a ConnectorHttpError with an agent-actionable message on a non-OK YouTube
 * Data API response, mapping Google's `reason` strings to the recovery the agent
 * should take: reconnect (bad/expired token), reconnect-with-scope (the connection
 * lacks the scope the tool needs, e.g. youtube.force-ssl for comment/caption writes),
 * wait-for-quota-reset (the daily quota is exhausted — resets midnight Pacific, no
 * Retry-After is sent), back-off (short-term rate limit), or ask-for-access (you do
 * not own the resource). On success the response is returned unchanged so the caller
 * can read the body. Pass the tool name so the message names the failing operation.
 */
export async function throwForYouTube(
  res: Response,
  toolName: string,
): Promise<Response> {
  if (res.ok) return res;
  const body = await readBody(res);
  const err = (body as GoogleErrorBody | undefined)?.error;
  const reason = err?.errors?.[0]?.reason;
  const apiMessage = err?.message;
  const prefix = `YouTube ${toolName} ${res.status}`;

  let message: string;
  if (res.status === 401) {
    message = `${prefix}: invalid or expired credentials. Reconnect YouTube.`;
  } else if (res.status === 403 && reason && QUOTA_REASONS.has(reason)) {
    message = `${prefix}: ${reason} — the daily YouTube API quota is exhausted (no Retry-After is sent; quota resets at midnight Pacific). Do not retry today; stop and report the quota limit.`;
  } else if (
    res.status === 429 ||
    (res.status === 403 && reason && RATE_LIMIT_REASONS.has(reason))
  ) {
    message = `${prefix}: ${reason ?? "rateLimitExceeded"} — short-term rate limit. Back off and retry with jitter.`;
  } else if (res.status === 403 && reason === "insufficientPermissions") {
    message = `${prefix}: insufficientPermissions — the connection's OAuth scope is too narrow. Reconnect YouTube with the access this tool needs (comment and caption operations require the youtube.force-ssl scope; uploads require youtube.upload).`;
  } else if (res.status === 403) {
    message = `${prefix}: ${reason ?? "forbidden"} — ${apiMessage ?? "access denied"}. This is either a missing OAuth scope (reconnect YouTube with the needed access — comment/caption writes need youtube.force-ssl) or you do not own this resource (reconnecting won't help; you can only modify videos, playlists, and subscriptions you own).`;
  } else if (res.status === 404) {
    message = `${prefix}: ${reason ?? "notFound"} — ${apiMessage ?? "the resource does not exist"}. Verify the id (resolve channels via getChannel, playlists via listPlaylists, videos via searchVideos/getVideo).`;
  } else {
    message = `${prefix}: ${apiMessage ?? reason ?? "request failed"}`;
  }

  throw ConnectorHttpError.fromResponseBody(res, body, { message });
}

/** True when a non-OK response body carries the given YouTube error reason. */
export function hasYouTubeReason(body: unknown, reason: string): boolean {
  const err = (body as GoogleErrorBody | undefined)?.error;
  return err?.errors?.some((e) => e.reason === reason) ?? false;
}

export { readBody };
