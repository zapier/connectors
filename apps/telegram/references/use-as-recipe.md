# Use as a recipe

For a harness that can't load pre-registered tools, can't shell out to a
terminal, and can't `import` this package — a code-execution sandbox that
writes and runs its own snippet against an HTTP API (e.g. an agent's
"execute a snippet of code" tool). This page teaches you enough to write that
code yourself, directly against the Telegram Bot API. It does not teach the
MCP, CLI, or SDK shapes this repo also ships — see `SKILL.md`'s Setup table
if you actually have one of those instead.

Every vendor-behavior rule below (size limits, timing windows, permission
requirements, error semantics) is a **pointer**, not a restatement — follow
the link into [`telegram-api-gotchas.md`](telegram-api-gotchas.md) for the
actual rule text and its source. This page only adds the mechanical shape of
requests/responses, derived from this connector's own request-building code.

## Auth / base URL

Telegram's own convention (not this repo's): every Bot API call is an HTTPS
request whose path embeds the bot token —

```
https://api.telegram.org/bot<BOT_TOKEN>/<MethodName>
```

`<BOT_TOKEN>` is the credential [@BotFather](https://core.telegram.org/bots/features#botfather)
issues for your bot; `<MethodName>` is the API method (`sendMessage`,
`getChat`, etc. — one per operation below). Send a `POST` with a JSON body
(`Content-Type: application/json`) containing the method's parameters; nearly
every method in this connector is called this way. There is no separate
OAuth step and no scopes — the token in the URL _is_ the credential, so treat
it like a secret (don't log full request URLs).

## Request/response shape patterns

Every method returns the same envelope — see **Error handling** below for the
failure side. On success, `result` holds the shape documented per family here.
Types are structural (field name + type); this connector's own Zod schemas
are the source. Where a specific size/length/count bound matters, that bound
is a vendor-behavior fact — check the current method page at
<https://core.telegram.org/bots/api> (or the pointer given) rather than
guessing a number.

### Sending content (`sendMessage`, `sendPhoto`, `sendDocument`, `sendVideo`, `sendAudio`, `sendLocation`, `sendContact`, `sendPoll`)

All of these share one request pattern: `POST .../send<Kind>` with a body
built from:

- `chat_id: string` — required on every send. Numeric id or `@username`.
- one or more **content fields**, specific to the kind being sent:
  - `sendMessage`: `text: string`
  - `sendPhoto`: `photo: string` — an HTTPS URL or a reused `file_id`
  - `sendDocument`: `document: string` — URL or `file_id`
  - `sendVideo`: `video: string` — URL or `file_id`, plus optional
    `duration: number`, `width: number`, `height: number`,
    `supports_streaming: boolean`
  - `sendAudio`: `audio: string` — URL or `file_id`, plus optional
    `duration: number`, `performer: string`, `title: string`
  - `sendLocation`: `latitude: number`, `longitude: number`, optional
    `horizontal_accuracy: number`
  - `sendContact`: `phone_number: string`, `first_name: string`, optional
    `last_name: string`, `vcard: string`
  - `sendPoll`: `question: string`, `options: string[]`, optional
    `type: "regular" | "quiz"`, `is_anonymous: boolean`,
    `allows_multiple_answers: boolean`, `correct_option_id: number` (required
    when `type` is `"quiz"`), `explanation: string`,
    `explanation_parse_mode: string`, `open_period: number`,
    `is_closed: boolean` — for the option-count/length/duration bounds this
    method enforces, see
    [Polls & quizzes](telegram-api-gotchas.md#polls--quizzes-sendpoll)
- media/text kinds that carry a caption (`sendPhoto`, `sendDocument`,
  `sendVideo`, `sendAudio`) accept optional `caption: string` and
  `parse_mode: string` — see
  [Formatting](telegram-api-gotchas.md#formatting-parse_mode) for the
  accepted `parse_mode` values and their escaping rules; `sendMessage` and
  `sendPoll`'s `explanation` use the same `parse_mode` contract
- shared optional fields on nearly every send: `disable_notification: boolean`,
  `protect_content: boolean`, `message_thread_id: number` (targets a forum
  topic), and — `sendMessage`/`editMessageText` only — a link-preview toggle
  and a reply-target (see note below)
- media sent by URL vs. by `file_id` has different size/format ceilings per
  kind — see [Sending files](telegram-api-gotchas.md#sending-files) and the
  per-method notes it links to

**Note on nesting.** A couple of agent-facing fields are flattened for
convenience but the underlying API expects them nested — write the nested
form yourself: a "disable the link preview" toggle is sent as
`link_preview_options: { is_disabled: boolean }`, and "reply to message X" is
sent as `reply_parameters: { message_id: number }`. This is this connector's
own ergonomic flattening, not a Telegram rule — nest them back when you build
the request body directly.

All of these return a `Message` on success:

```
message_id: number       // pass this to edit/delete/pin/forward/copy calls
date: number             // unix seconds
chat: { id: number, type: string, title?: string, username?: string, first_name?: string, last_name?: string }
from?: { id: number, is_bot: boolean, first_name: string, last_name?: string, username?: string }
text?: string            // present for text messages
caption?: string         // present for media messages
photo?: [{ file_id, file_unique_id, width?, height?, file_size? }]
document?: { file_id, file_unique_id, file_name?, mime_type?, file_size? }
video?: { file_id, file_unique_id, duration?, width?, height?, mime_type?, file_size? }
audio?: { file_id, file_unique_id, duration?, performer?, title?, mime_type?, file_size? }
location?: { latitude: number, longitude: number }
contact?: { phone_number, first_name, last_name?, user_id? }
poll?: { id, question, total_voter_count?, is_closed?, is_anonymous?, type?, allows_multiple_answers?, options?: [{ text, voter_count }] }
```

(Only the field matching what you sent will be populated — a `sendPhoto`
call gets back a `photo` array, a `sendPoll` call gets back a `poll`, etc.)

### Managing messages (`editMessageText`, `deleteMessage`, `forwardMessage`, `copyMessage`, `pinChatMessage`, `unpinChatMessage`)

- `editMessageText`: `POST .../editMessageText` with `chat_id: string`,
  `message_id: number`, `text: string`, optional `parse_mode: string` and the
  same link-preview nesting described above. Returns a `Message`.
- `deleteMessage`: `POST .../deleteMessage` with `chat_id: string`,
  `message_id: number`. Returns just a boolean success flag (Telegram's raw
  `result` is the literal `true`) — for which messages can actually be
  deleted and by whom, see
  [Deleting messages](telegram-api-gotchas.md#deleting-messages).
- `forwardMessage`: `POST .../forwardMessage` with `chat_id` (destination),
  `from_chat_id` (source), `message_id`, plus the shared optional
  `disable_notification` / `protect_content` / `message_thread_id`. Returns a
  full `Message` — see
  [Copy vs. forward](telegram-api-gotchas.md#copy-vs-forward) for what's
  preserved vs. what forwarding blocks.
- `copyMessage`: same request shape as `forwardMessage`, plus optional
  `caption: string` / `parse_mode: string` to replace the caption. Returns
  **only** `{ message_id: number }`, not a full `Message` — see
  [Copy vs. forward](telegram-api-gotchas.md#copy-vs-forward) for why the
  response is smaller and the quiz-poll caveat.
- `pinChatMessage`: `POST .../pinChatMessage` with `chat_id`, `message_id`,
  optional `disable_notification: boolean`. Returns a boolean success flag —
  for the admin right this requires, see
  [Pinning](telegram-api-gotchas.md#pinning).
- `unpinChatMessage`: `POST .../unpinChatMessage` with `chat_id`, optional
  `message_id: number`. Returns a boolean success flag — for what omitting
  `message_id` does, see [Pinning](telegram-api-gotchas.md#pinning).

### Resolving chats, members, and the bot's own identity (`getMe`, `getChat`, `listRecentChats`, `getChatMember`, `getChatAdministrators`, `getChatMemberCount`)

- `getMe`: `POST .../getMe`, empty body. Returns a `User`:
  ```
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  can_join_groups?: boolean            // getMe only
  can_read_all_group_messages?: boolean // getMe only
  supports_inline_queries?: boolean    // getMe only
  ```
- `getChat`: `POST .../getChat` with `chat_id: string`. Returns a fuller chat
  record than the embedded `chat` on a `Message`:
  ```
  id: number
  type: string            // private | group | supergroup | channel
  title?: string
  username?: string
  first_name?: string
  last_name?: string
  description?: string
  invite_link?: string
  bio?: string
  ```
- `listRecentChats` is **not a single Telegram method** — it's this
  connector's own read-only wrapper over `getUpdates` (`POST .../getUpdates`
  with a `limit` and `allowed_updates: ["message", "channel_post"]`), which
  it scans and de-duplicates client-side into `{ chats: [<chat>] }`, using the
  same chat shape as the `chat` field on a `Message`. If you write this
  yourself, call `getUpdates` directly and do the same de-dup — see
  [Discovering chats](telegram-api-gotchas.md#discovering-chats-listrecentchats--getupdates)
  for the one condition that breaks this entirely.
- `getChatMember`: `POST .../getChatMember` with `chat_id: string`,
  `user_id: number`. Returns a `ChatMember`:
  ```
  status: string   // creator | administrator | member | restricted | left | kicked
  user: <User, shape above>
  is_anonymous?: boolean
  can_manage_chat?: boolean
  can_delete_messages?: boolean
  can_restrict_members?: boolean
  can_invite_users?: boolean
  can_pin_messages?: boolean
  ```
  For when this call is guaranteed to actually resolve, see
  [Identity & chat_id](telegram-api-gotchas.md#identity--chat_id).
- `getChatAdministrators`: `POST .../getChatAdministrators` with
  `chat_id: string`. Returns `{ administrators: [<ChatMember, shape above>] }`.
- `getChatMemberCount`: `POST .../getChatMemberCount` with `chat_id: string`.
  Returns `{ count: number }`.

### Files (`getFile`)

`POST .../getFile` with `file_id: string` (lifted off any `photo`/`document`/
`video`/`audio` object in a `Message`). Returns:

```
file_id: string
file_unique_id: string
file_size?: number
file_path?: string
```

Download the bytes over a _separate_ plain HTTPS GET — not a Bot API method
call — at `https://api.telegram.org/file/bot<BOT_TOKEN>/<file_path>`. See
[Downloading files](telegram-api-gotchas.md#downloading-files-getfile) for
how long that link stays valid and the download size ceiling, and
[Sending files](telegram-api-gotchas.md#sending-files) for the difference
between `file_id` and `file_unique_id`.

## Error handling

Telegram signals failure two ways at once, and you should check both: the
HTTP status is typically 4xx, **and** the JSON body's `ok` field is `false`.
On success, `ok` is `true` and the payload is under `result`; the shapes above
are what `result` holds per method. The failure body has this shape:

```
ok: false
error_code: number
description: string
parameters?: {
  retry_after?: number
  migrate_to_chat_id?: number
}
```

Write your own client to branch on `ok` (or the HTTP status) before trying to
read `result`, and to inspect `description` and `parameters` rather than
switching only on `error_code` — for why, and what `retry_after` and
`migrate_to_chat_id` each mean and how to act on them, see
[Response envelope & errors](telegram-api-gotchas.md#response-envelope--errors).

## Critical rules

These are vendor-behavior facts your generated code needs to get right; each
is sourced and explained in `telegram-api-gotchas.md` — read the linked
section before writing code that touches that area, rather than
re-deriving the rule from the shapes above:

- **chat_id conventions and reachability** — numeric-vs-`@username`, the
  negative id form for supergroups/channels, `getChatMember`'s admin
  requirement, and why a bot can't DM a user first:
  [Identity & chat_id](telegram-api-gotchas.md#identity--chat_id)
- **Discovering chats** — `listRecentChats`/`getUpdates` and the one thing
  that silently breaks it:
  [Discovering chats](telegram-api-gotchas.md#discovering-chats-listrecentchats--getupdates)
- **Sending media** — URL vs. `file_id`, size ceilings per content kind, and
  per-method format restrictions:
  [Sending files](telegram-api-gotchas.md#sending-files)
- **Downloading media** — the download URL form, link lifetime, and size
  ceiling: [Downloading files](telegram-api-gotchas.md#downloading-files-getfile)
- **Forward vs. copy semantics**:
  [Copy vs. forward](telegram-api-gotchas.md#copy-vs-forward)
- **Delete eligibility and time window**:
  [Deleting messages](telegram-api-gotchas.md#deleting-messages)
- **Pin/unpin permission requirements and unpin-with-no-id behavior**:
  [Pinning](telegram-api-gotchas.md#pinning)
- **Poll/quiz field bounds**:
  [Polls & quizzes](telegram-api-gotchas.md#polls--quizzes-sendpoll)
- **Rate limits and backoff**: [Rate limits](telegram-api-gotchas.md#rate-limits)
- **`parse_mode` escaping rules (HTML vs. MarkdownV2)**:
  [Formatting](telegram-api-gotchas.md#formatting-parse_mode)
- **Response envelope and error fields** (`error_code` stability,
  `retry_after`, `migrate_to_chat_id`):
  [Response envelope & errors](telegram-api-gotchas.md#response-envelope--errors)

## Where to go next

- [Response envelope & errors](telegram-api-gotchas.md#response-envelope--errors) — the `ok`/`result`/`error_code`/`description`/`parameters` contract
- [Identity & chat_id](telegram-api-gotchas.md#identity--chat_id) — resolving and validating `chat_id`
- [Discovering chats (listRecentChats / getUpdates)](telegram-api-gotchas.md#discovering-chats-listrecentchats--getupdates) — finding chats to message
- [Sending files](telegram-api-gotchas.md#sending-files) — URL vs. `file_id`, size limits
- [Downloading files (getFile)](telegram-api-gotchas.md#downloading-files-getfile) — the download URL and link lifetime
- [Copy vs. forward](telegram-api-gotchas.md#copy-vs-forward) — attribution and response-shape differences
- [Deleting messages](telegram-api-gotchas.md#deleting-messages) — who can delete what, and when
- [Pinning](telegram-api-gotchas.md#pinning) — permissions and unpin-without-`message_id`
- [Polls & quizzes (sendPoll)](telegram-api-gotchas.md#polls--quizzes-sendpoll) — field bounds for polls and quizzes
- [Rate limits](telegram-api-gotchas.md#rate-limits) — per-chat, per-group, and bulk send guidance
- [Formatting (parse_mode)](telegram-api-gotchas.md#formatting-parse_mode) — HTML vs. MarkdownV2 escaping
