# Discord message formatting

How to compose the `content` string this connector's message tools send
(`sendChannelMessage`, `sendDirectMessage`, `editMessage`, `executeWebhook`,
`createThread`'s opening message) and how to encode reaction emoji
(`addReaction` / `removeReaction`). Load this whenever composing a message body
or a reaction. Every claim is sourced from public Discord docs (URLs inline).

Discord "utilizes a subset of markdown for rendering message content on its
clients, while also adding some custom functionality to enable things like
mentioning users and channels."
([API Reference](https://docs.discord.com/developers/reference))

## Markdown deltas

Discord-flavored markdown; the markers that matter for composing text
([Markdown Text 101](https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline)):

| Style           | Syntax                               |
| --------------- | ------------------------------------ |
| Bold            | `**text**`                           |
| Italic          | `*text*` or `_text_`                 |
| Bold italic     | `***text***`                         |
| Underline       | `__text__`                           |
| Strikethrough   | `~~text~~`                           |
| Spoiler         | `\|\|text\|\|` (vertical bars/pipes) |
| Inline code     | `` `code` ``                         |
| Code block      | triple backticks around the block    |
| Block quote     | `> text` (single line)               |
| Multiline quote | `>>> text` (rest of message)         |

Notes: bold/italic combine (three asterisks = bold + italic); underline is two
underscores (single underscores are italic). Spoilers wrap text in double
vertical bars. Code spans/blocks use backticks. Block quotes prefix a line with
`> ` (or `>>> ` to quote everything that follows).
([Spoiler Tags](https://support.discord.com/hc/en-us/articles/360022320632-Spoiler-Tags))

## Mentions (tied to the resolver tools)

Mentions are custom markup embedded in `content`. Each requires an id you resolve
from a list tool
([API Reference — Message Formatting](https://docs.discord.com/developers/reference)):

| Mention        | Syntax          | Example                        | Resolve the id via              |
| -------------- | --------------- | ------------------------------ | ------------------------------- |
| User           | `<@USER_ID>`    | `<@80351110224678912>`         | `listMembers` / `searchMembers` |
| Channel        | `<#CHANNEL_ID>` | `<#103735883630395392>`        | `listChannels`                  |
| Role           | `<@&ROLE_ID>`   | `<@&165511591545143296>`       | `listRoles`                     |
| Custom emoji   | `<:NAME:ID>`    | `<:mmLol:216154654256398347>`  | `listEmojis`                    |
| Animated emoji | `<a:NAME:ID>`   | `<a:b1nzy:392938283556143104>` | `listEmojis` (`animated: true`) |

The ids are snowflakes — pass them through as the strings the list tools return;
never coerce to numbers (see `discord-api-gotchas.md`).

## Controlling who actually gets pinged (`allowed_mentions`)

"Using the markdown for users or roles will mention the target(s), and notify
them depending on the sender's permissions as well as the value of the
`allowed_mentions` field."
([API Reference](https://docs.discord.com/developers/reference))

`allowed_mentions.parse` is "an array of allowed mention types to parse from the
content," where the types are
([Message Resource — Allowed Mentions](https://docs.discord.com/developers/resources/message)):

- `"users"` — user mentions
- `"roles"` — role mentions
- `"everyone"` — `@everyone` and `@here` mentions

**To render a mention without pinging anyone, pass `parse: []`** (an empty
array). The `<@…>` / `<@&…>` text still shows as a mention, but no notification
fires. This connector's `sendChannelMessage` exposes exactly this
`allowed_mentions: { parse: [...] }` control. Discord also recommends: "If you
are passing user-generated strings into message content, consider sanitizing the
data … and using `allowed_mentions` to prevent unexpected mentions."
([Message Resource](https://docs.discord.com/developers/resources/message))

## Content length limit

Message `content` is capped at **2000 characters**. Split or truncate longer text
before sending; over-length content is rejected.
([Message Resource](https://docs.discord.com/developers/resources/message))

## Reaction emoji encoding

For `addReaction` / `removeReaction`, the emoji is a path segment, and "the emoji
must be URL Encoded or the request will fail with `10014: Unknown Emoji`."
([Message Resource — Create Reaction](https://docs.discord.com/developers/resources/message))

- **Unicode emoji:** the raw character (e.g. 👍), URL-encoded in the path.
- **Custom emoji:** "you must encode it in the format `name:id`" — the emoji name
  and its id joined by a colon (e.g. `mmLol:216154654256398347`), then
  URL-encoded. Resolve `name` and `id` from `listEmojis`. Note this is the bare
  `name:id` form, **not** the `<:name:id>` angle-bracket form used _inside_
  message content.
