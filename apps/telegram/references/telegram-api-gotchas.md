# Telegram Bot API — gotchas & formatting

Agent-facing notes on Telegram Bot API behaviors that aren't obvious from the tool
schemas. Every claim below is sourced from the official docs at
<https://core.telegram.org/bots/api> (plus the linked Telegram pages). Anchors point
at the exact method/section.

## Response envelope & errors

Every response is a JSON object with a Boolean `ok` field. On success the payload is in
`result`; on failure `ok` is `false` and the human-readable reason is in `description`,
with an integer `error_code`. The docs warn the `error_code` "contents are subject to
change in the future", so branch on `description` (and the structured `parameters`), not
on the numeric code alone. Some errors carry an optional `parameters` object of type
`ResponseParameters`. ([Making requests](https://core.telegram.org/bots/api#making-requests))

`ResponseParameters` has two fields worth handling:

- `migrate_to_chat_id` — "The group has been migrated to a supergroup with the specified
  identifier." When you see it, retry against the new id and persist it; the old group id
  is dead. ([ResponseParameters](https://core.telegram.org/bots/api#responseparameters))
- `retry_after` — on a 429, the "Number of seconds left to wait before the request can be
  repeated." ([ResponseParameters](https://core.telegram.org/bots/api#responseparameters))

## Identity & chat_id

- `chat_id` is either a numeric id or a public `@username`.
- Supergroups and channels use large **negative** ids. Telegram derives the Bot-API id by
  taking the internal channel id, adding `1000000000000`, and negating it
  (`-(1000000000000 + id)`), which is why these ids appear in the `-100…` form, e.g.
  `-1001234567890`. ([Bot API dialog IDs](https://core.telegram.org/api/bots/ids))
- `getChatMember` "is only guaranteed to work for other users if the bot is an
  administrator in the chat." ([getChatMember](https://core.telegram.org/bots/api#getchatmember))
- A bot **cannot** start a conversation with a user — the user must message the bot (or
  the bot must be added to the group) first. This surfaces as a `Forbidden` error in the
  response `description`; do not retry it. (Observed from the API's error responses; not
  stated on the method pages.)

## Discovering chats (listRecentChats / getUpdates)

`listRecentChats` reads the bot's update feed (`getUpdates`). That feed "will not work if
an outgoing webhook is set up." ([getUpdates](https://core.telegram.org/bots/api#getupdates))
If a webhook is active on the bot, use a known `chat_id` or `@username` instead.

## Sending files

Three ways to supply media, with different limits:

- **Reuse a `file_id`** from a previous message — no size limit, fastest.
- **By HTTPS URL** — Telegram downloads it for you, but "5 MB max size for photos and
  20 MB max for other types of content."
  ([Sending files](https://core.telegram.org/bots/api#sending-files))
- For `sendDocument`, "sending by URL will currently only work for .PDF and .ZIP files."
  ([sendDocument](https://core.telegram.org/bots/api#senddocument))

Other per-type notes:

- `sendPhoto`: "The photo must be at most 10 MB in size. The photo's width and height must
  not exceed 10000 in total. Width and height ratio must be at most 20."
  ([sendPhoto](https://core.telegram.org/bots/api#sendphoto))
- `sendAudio` is for files "you want Telegram clients to display … in the music player.
  Your audio must be in the .MP3 or .M4A format."
  ([sendAudio](https://core.telegram.org/bots/api#sendaudio))
- `sendVideo`: "Telegram clients support MPEG4 videos (other formats may be sent as
  Document)." ([sendVideo](https://core.telegram.org/bots/api#sendvideo))
- These send methods can upload files "of up to 50 MB in size" via multipart, "this limit
  may be changed in the future." ([sendDocument](https://core.telegram.org/bots/api#senddocument))

## Downloading files (getFile)

`getFile` returns a `File` whose `file_path` is downloaded from
`https://api.telegram.org/file/bot<token>/<file_path>`. "It is guaranteed that the link
will be valid for at least 1 hour. When the link expires, a new one can be requested by
calling getFile." Bots "can download files of up to 20MB in size."
([getFile](https://core.telegram.org/bots/api#getfile))

The `file_id` "can be used to download or reuse the file" in send methods; the
`file_unique_id` is a stable id that **can't** be used to download.
([File](https://core.telegram.org/bots/api#file))

## Copy vs. forward

- `forwardMessage` keeps the "forwarded from" header. "Service messages and messages with
  protected content can't be forwarded."
  ([forwardMessage](https://core.telegram.org/bots/api#forwardmessage))
- `copyMessage` "is analogous to the method forwardMessage, but the copied message doesn't
  have a link to the original message. Returns the MessageId of the sent message on
  success" — i.e. only the new `message_id`, not a full Message. "A quiz poll can be copied
  only if the value of the field correct_option_id is known to the bot."
  ([copyMessage](https://core.telegram.org/bots/api#copymessage))

## Deleting messages

`deleteMessage` has documented limits ([deleteMessage](https://core.telegram.org/bots/api#deletemessage)):

- "A message can only be deleted if it was sent less than 48 hours ago."
- "Service messages about a supergroup, channel, or forum topic creation can't be deleted."
- "Bots can delete outgoing messages in private chats, groups, and supergroups."
- "Bots can delete incoming messages in private chats."
- "If the bot is an administrator of a group, it can delete any message there."
- "If the bot has can_delete_messages administrator right in a supergroup or a channel, it
  can delete any message there."

## Pinning

- `pinChatMessage`: "the bot must be an administrator with the 'can_pin_messages' right or
  the 'can_edit_messages' right to pin messages in groups and channels respectively."
  ([pinChatMessage](https://core.telegram.org/bots/api#pinchatmessage))
- `unpinChatMessage`: if `message_id` is "not specified, the most recent pinned message (by
  sending date) will be unpinned."
  ([unpinChatMessage](https://core.telegram.org/bots/api#unpinchatmessage))

## Polls & quizzes (sendPoll)

- `question`: "1-300 characters"; each option: "1-100 characters"; options list: "1-12
  answer options."
- `is_anonymous`: "True, if the poll needs to be anonymous, defaults to True."
- `open_period`: "Amount of time in seconds the poll will be active after creation,
  5-2628000. Can't be used together with close_date."
- Quiz `explanation` (shown on a wrong answer): "0-200 characters with at most 2 line feeds
  after entities parsing." A quiz requires `correct_option_id`.

([sendPoll](https://core.telegram.org/bots/api#sendpoll))

## Rate limits

From the [Bots FAQ](https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this):

- "In a single chat, avoid sending more than one message per second."
- "In a group, bots are not be able to send more than 20 messages per minute."
- "For bulk notifications, bots are not able to broadcast more than about 30 messages per
  second, unless they enable paid broadcasts" (which raises the limit to "up to 1000
  messages per second").

A 429 response carries `parameters.retry_after`; honor it before retrying.

## Formatting (parse_mode)

`parse_mode` accepts `HTML`, `MarkdownV2`, or the legacy `Markdown`. Prefer **HTML** — its
escaping rules are the simplest.

**HTML.** Supported tags include `<b>`/`<strong>`, `<i>`/`<em>`, `<u>`/`<ins>`,
`<s>`/`<strike>`/`<del>`, `<a href="…">`, `<code>`, `<pre>`, and `<blockquote>` (plus
spoiler and `<tg-spoiler>`). The only escaping rule: "All <, > and & symbols that are not a
part of a tag or an HTML entity must be replaced with the corresponding HTML entities
(< with `&lt;`, > with `&gt;` and & with `&amp;`)."
([HTML style](https://core.telegram.org/bots/api#html-style))

**MarkdownV2.** Far more reserved characters: "In all other places characters
`'_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'`must be escaped with the preceding character`'\'`." Also "any character with code between
1 and 126 inclusively can be escaped … with a preceding `'\'`character," and inside`pre`/`code`and inline-link`(...)` parts the rules differ again.
([MarkdownV2 style](https://core.telegram.org/bots/api#markdownv2-style))

A malformed entity comes back as a `Bad Request` with "can't parse entities" in the
`description` — fix the markup for the chosen `parse_mode` rather than retrying as-is.
</content>
</invoke>
