// Shared input schemas for the small, well-shaped Notion objects that recur
// across the write tools (page/database icon + cover) and the query tool
// (sort entries). These shapes are finite and documented, so we type them
// rather than leaving an agent to guess at a loose record. Lifted here so a
// version of the shape lives in one place instead of being re-inlined per
// script. Property values, filters, and block content stay loose (open,
// recursive DSLs) and instead carry a reference-doc pointer in their describe.

import { z } from "zod";

/** An emoji icon, e.g. { "type": "emoji", "emoji": "📄" }. */
const emojiIcon = z
  .object({
    type: z.literal("emoji"),
    emoji: z.string().describe("A single emoji character, e.g. 📄."),
  })
  .strict();

/** An external file/image, e.g. { "type": "external", "external": { "url": "https://…" } }. */
const externalFile = z
  .object({
    type: z.literal("external"),
    external: z
      .object({ url: z.string().describe("A publicly accessible URL.") })
      .strict(),
  })
  .strict();

/**
 * A page or database icon: either an emoji or an externally-hosted image.
 * (Notion also supports uploaded `file` and `custom_emoji` icons, which aren't
 * agent-constructable here; see https://developers.notion.com/reference/page#icon.)
 */
export const iconInput = z
  .union([emojiIcon, externalFile])
  .describe(
    'An emoji ({ "type": "emoji", "emoji": "📄" }) or an external image ({ "type": "external", "external": { "url": "https://…" } }).',
  );

/** A page or database cover: an externally-hosted image. */
export const coverInput = externalFile.describe(
  'An external image: { "type": "external", "external": { "url": "https://…" } }.',
);

/**
 * A single sort entry for queryDataSource. Sort by a property name or by a
 * timestamp, in the given direction. See
 * https://developers.notion.com/reference/post-database-query-sort.
 */
export const sortInput = z
  .object({
    property: z
      .string()
      .describe("Name of the property to sort by.")
      .optional(),
    timestamp: z
      .enum(["created_time", "last_edited_time"])
      .describe("Sort by a timestamp instead of a property.")
      .optional(),
    direction: z.enum(["ascending", "descending"]).describe("Sort direction."),
  })
  .strict();
