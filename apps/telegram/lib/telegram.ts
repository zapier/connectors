import { ConnectorHttpError } from "@zapier/connectors-sdk";
import { z } from "zod";

/** Base host for the Telegram Bot API. The /bot<token>/ path segment is injected by the connection resolver. */
export const TELEGRAM_API = "https://api.telegram.org";

// ───────────────────────── Shared output schemas ─────────────────────────
// Telegram returns the same object shapes (Message, Chat, User, ChatMember)
// across many methods; these are the single source of truth so the agent sees
// one consistent shape per resource. Plain z.object — unknown keys are stripped
// on parse (the validator rejects untyped passthrough).

/** Minimal chat identity, as embedded in messages and returned by listRecentChats. */
export const chatSchema = z.object({
  id: z
    .number()
    .int()
    .describe(
      "Unique chat identifier. Supergroups/channels are large negative numbers (-100-prefixed).",
    ),
  type: z
    .string()
    .describe("Chat type — private, group, supergroup, or channel."),
  title: z
    .string()
    .describe("Title, for groups/supergroups/channels.")
    .optional(),
  username: z
    .string()
    .describe("Public @username, for users/groups/channels that have one.")
    .optional(),
  first_name: z
    .string()
    .describe("First name of the other party, for private chats.")
    .optional(),
  last_name: z
    .string()
    .describe("Last name of the other party, for private chats.")
    .optional(),
});

/** A Telegram user or bot. */
export const userSchema = z.object({
  id: z.number().int().describe("Unique user identifier."),
  is_bot: z.boolean().describe("True if this user is a bot."),
  first_name: z.string().describe("User's or bot's first name."),
  last_name: z.string().describe("User's last name, if set.").optional(),
  username: z
    .string()
    .describe("User's or bot's @username, without the @.")
    .optional(),
  language_code: z
    .string()
    .describe("IETF language tag of the user's language.")
    .optional(),
  can_join_groups: z
    .boolean()
    .describe("(getMe only) Whether the bot can be added to groups.")
    .optional(),
  can_read_all_group_messages: z
    .boolean()
    .describe("(getMe only) Whether privacy mode is disabled for the bot.")
    .optional(),
  supports_inline_queries: z
    .boolean()
    .describe("(getMe only) Whether the bot supports inline queries.")
    .optional(),
});

/** A message sent in a chat. Media-specific fields are present only for the matching send type. */
export const messageSchema = z
  .object({
    message_id: z
      .number()
      .int()
      .describe(
        "Unique message identifier within the chat. Pass to edit/delete/pin/forward/copy tools.",
      ),
    date: z
      .number()
      .int()
      .describe(
        "Date the message was sent, as a Unix epoch timestamp in seconds.",
      ),
    text: z
      .string()
      .describe("Text of the message, for text messages.")
      .optional(),
    caption: z.string().describe("Caption, for media messages.").optional(),
    chat: chatSchema,
    from: userSchema.optional(),
    message_thread_id: z
      .number()
      .int()
      .describe("For forum supergroups — the topic the message belongs to.")
      .optional(),
    has_protected_content: z
      .boolean()
      .describe("True if the message can't be forwarded or saved.")
      .optional(),
    photo: z
      .array(
        z.object({
          file_id: z
            .string()
            .describe(
              "Identifier for this photo size, reusable in send methods.",
            ),
          file_unique_id: z.string().describe("Stable unique identifier."),
          width: z.number().int().describe("Photo width.").optional(),
          height: z.number().int().describe("Photo height.").optional(),
          file_size: z
            .number()
            .int()
            .describe("File size in bytes.")
            .optional(),
        }),
      )
      .describe(
        "Available sizes of the photo, for photo messages (largest last).",
      )
      .optional(),
    document: z
      .object({
        file_id: z
          .string()
          .describe("Identifier for the file, reusable in send methods."),
        file_unique_id: z.string().describe("Stable unique identifier."),
        file_name: z.string().describe("Original filename.").optional(),
        mime_type: z.string().describe("MIME type.").optional(),
        file_size: z.number().int().describe("File size in bytes.").optional(),
      })
      .describe("File metadata, for document messages.")
      .optional(),
    video: z
      .object({
        file_id: z
          .string()
          .describe("Identifier for the file, reusable in send methods."),
        file_unique_id: z.string().describe("Stable unique identifier."),
        duration: z.number().int().describe("Duration in seconds.").optional(),
        width: z.number().int().describe("Video width.").optional(),
        height: z.number().int().describe("Video height.").optional(),
        mime_type: z.string().describe("MIME type.").optional(),
        file_size: z.number().int().describe("File size in bytes.").optional(),
      })
      .describe("Video metadata, for video messages.")
      .optional(),
    audio: z
      .object({
        file_id: z
          .string()
          .describe("Identifier for the file, reusable in send methods."),
        file_unique_id: z.string().describe("Stable unique identifier."),
        duration: z.number().int().describe("Duration in seconds.").optional(),
        performer: z.string().describe("Performer.").optional(),
        title: z.string().describe("Track title.").optional(),
        mime_type: z.string().describe("MIME type.").optional(),
        file_size: z.number().int().describe("File size in bytes.").optional(),
      })
      .describe("Audio metadata, for audio messages.")
      .optional(),
    location: z
      .object({
        latitude: z.number().describe("Latitude."),
        longitude: z.number().describe("Longitude."),
      })
      .describe("Location data, for location messages.")
      .optional(),
    contact: z
      .object({
        phone_number: z.string().describe("Contact's phone number."),
        first_name: z.string().describe("Contact's first name."),
        last_name: z.string().describe("Contact's last name.").optional(),
        user_id: z
          .number()
          .int()
          .describe("Contact's Telegram user id, if known.")
          .optional(),
      })
      .describe("Contact data, for contact messages.")
      .optional(),
    poll: z
      .object({
        id: z.string().describe("Unique poll identifier."),
        question: z.string().describe("Poll question."),
        total_voter_count: z
          .number()
          .int()
          .describe("Total number of users that voted.")
          .optional(),
        is_closed: z
          .boolean()
          .describe("Whether the poll is closed.")
          .optional(),
        is_anonymous: z
          .boolean()
          .describe("Whether the poll is anonymous.")
          .optional(),
        type: z.string().describe("Poll type — regular or quiz.").optional(),
        allows_multiple_answers: z
          .boolean()
          .describe("Whether multiple answers are allowed.")
          .optional(),
        options: z
          .array(
            z.object({
              text: z.string().describe("Option text."),
              voter_count: z
                .number()
                .int()
                .describe("Number of users that picked this option."),
            }),
          )
          .describe("Poll options with vote counts.")
          .optional(),
      })
      .describe("Poll data, for poll messages.")
      .optional(),
  })
  .describe(
    "A message sent in a chat. Media-specific fields are present only for the matching send type.",
  );

/** Full information about a chat, returned by getChat. */
export const chatFullInfoSchema = z
  .object({
    id: z.number().int().describe("Unique chat identifier."),
    type: z
      .string()
      .describe("Chat type — private, group, supergroup, or channel."),
    title: z
      .string()
      .describe("Title, for groups/supergroups/channels.")
      .optional(),
    username: z.string().describe("Public @username, if any.").optional(),
    first_name: z
      .string()
      .describe("First name of the other party, for private chats.")
      .optional(),
    last_name: z
      .string()
      .describe("Last name of the other party, for private chats.")
      .optional(),
    description: z
      .string()
      .describe("Description, for groups/supergroups/channels.")
      .optional(),
    invite_link: z
      .string()
      .describe("Primary invite link, for groups/supergroups/channels.")
      .optional(),
    bio: z
      .string()
      .describe("Bio of the other party, for private chats.")
      .optional(),
  })
  .describe("Full information about a chat, returned by getChat.");

/** A member of a chat, with status and role. */
export const chatMemberSchema = z
  .object({
    status: z
      .string()
      .describe(
        "Member status — creator, administrator, member, restricted, left, or kicked.",
      ),
    user: userSchema,
    is_anonymous: z
      .boolean()
      .describe("For admins/creator — whether their presence is hidden.")
      .optional(),
    can_manage_chat: z
      .boolean()
      .describe("Administrator right — can access the chat event log, etc.")
      .optional(),
    can_delete_messages: z
      .boolean()
      .describe("Administrator right — can delete others' messages.")
      .optional(),
    can_restrict_members: z
      .boolean()
      .describe("Administrator right — can restrict, ban, or unban members.")
      .optional(),
    can_invite_users: z
      .boolean()
      .describe("Administrator right — can invite new users.")
      .optional(),
    can_pin_messages: z
      .boolean()
      .describe("Administrator right — can pin messages.")
      .optional(),
  })
  .describe("A member of a chat, with status and role.");

/** Confirmation for an operation that returns no data (the Telegram API returns the literal true). */
export const okResultSchema = z
  .object({ ok: z.boolean().describe("True when the operation succeeded.") })
  .describe("Confirmation that the operation succeeded.");

// ───────────────────────── Error handling ─────────────────────────
//
// Telegram signals failure with an HTTP 4xx/409 status AND an
// `{ ok:false, error_code, description, parameters? }` body. error_code is
// documented as subject to change, so the hint logic branches on the
// `description` text (where the distinguishing detail lives) plus the
// structured `parameters`. Centralized here so the mapping is identical across
// all tools (mirrors Slack's `mapSlackError`/`readSlack`).

/** The envelope every Telegram Bot API response shares. */
export interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number; migrate_to_chat_id?: number };
}

/** Build an actionable, agent-facing hint for a failed Telegram response. */
function telegramErrorHint(body: TelegramResponse, status: number): string {
  const desc = body.description ?? "unknown error";
  const d = desc.toLowerCase();
  const code = body.error_code ?? status;
  const migrateTo = body.parameters?.migrate_to_chat_id;
  const retryAfter = body.parameters?.retry_after;

  if (code === 401 || d.includes("unauthorized"))
    return "the bot token is invalid — check the connection (TELEGRAM_BOT_TOKEN) and reconnect.";
  if (migrateTo !== undefined)
    return `this group has migrated to a supergroup — retry with chat_id ${migrateTo} and persist the new id.`;
  if (code === 429)
    return `rate limited${retryAfter !== undefined ? ` — retry after ${retryAfter}s` : ""}.`;
  if (d.includes("chat not found"))
    return "chat not found — verify the chat_id (resolve via listRecentChats or getChat); the bot must be a member.";
  if (d.includes("can't initiate conversation"))
    return "the bot can't start a private chat — the user must message the bot first.";
  if (
    d.includes("blocked") ||
    d.includes("kicked") ||
    d.includes("not a member") ||
    d.includes("deactivated")
  )
    return `the bot can't message this chat (${desc}). Do not retry.`;
  if (d.includes("webhook is active"))
    return "can't read recent updates while a webhook is active on this bot; use a known chat_id or @username instead.";
  if (d.includes("can't parse entities"))
    return "message formatting is invalid for the chosen parse_mode — check the HTML/MarkdownV2 syntax.";
  if (d.includes("not found"))
    return `${desc} — the target may no longer exist or be too old.`;
  return desc;
}

/**
 * Build a `ConnectorHttpError` from a failed Telegram response. The message
 * names the failing tool, the error_code, and a recovery hint; the full
 * response (status, headers, and the `{ ok:false, … }` body carrying
 * `parameters`) is carried for agents/CLI to inspect.
 */
export function mapTelegramError(
  tool: string,
  res: Pick<Response, "status" | "statusText" | "headers">,
  body: TelegramResponse,
): ConnectorHttpError {
  const code = body.error_code ?? res.status;
  return ConnectorHttpError.fromResponseBody(res, body, {
    message: `Telegram ${tool} ${code}: ${telegramErrorHint(body, res.status)}`,
  });
}

/**
 * Read a Telegram response, enforce success (HTTP status + the `ok` flag), and
 * return the parsed `{ ok, result, … }` envelope. Throws a mapped
 * `ConnectorHttpError` otherwise. Callers read `.result` (or `.ok`) off the
 * returned body — mirrors Slack's `readSlack`.
 */
export async function readTelegram(
  tool: string,
  res: Pick<Response, "ok" | "status" | "statusText" | "headers" | "json">,
): Promise<TelegramResponse> {
  let body: TelegramResponse;
  try {
    body = (await res.json()) as TelegramResponse;
  } catch {
    body = { ok: false, description: res.statusText };
  }
  if (!res.ok || body.ok === false) {
    throw mapTelegramError(tool, res, body);
  }
  return body;
}
