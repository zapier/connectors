# Discord API gotchas

Quirks and edge cases of the Discord HTTP API this connector calls. Every claim
below is sourced from public Discord developer documentation (URLs inline). Load
this when an API call errors or behaves unexpectedly.

All requests target the versioned base URL `https://discord.com/api/v10` — the
connector pins `/v10` on every endpoint, so behavior matches the v10 docs.
([API Reference](https://docs.discord.com/developers/reference))

## Authentication

- Auth is a single HTTP header: `Authorization: Bot <token>`. The scheme word is
  `Bot`, **not** `Bearer` — the docs give the literal example
  `Authorization: Bot MTk4NjIyNDgzNDcxOTI1MjQ4.Cl2FMQ.ZnCjm1XVW7vRze4b7Cq4se7kKWs`.
  ([API Reference](https://docs.discord.com/developers/reference))
- The bot token is **static and long-lived** — there is no refresh/expiry cycle.
  Bot users "are authenticated using the bot token found in your app's settings"
  and "have full access to most API routes without using bearer tokens."
  ([API Reference](https://docs.discord.com/developers/reference))
- A bot is added to a server through the OAuth2 authorize URL with the `bot`
  scope, e.g. `https://discord.com/oauth2/authorize?client_id=...&scope=bot&permissions=...`;
  the installing user needs the proper permissions in that guild. Being added to
  a guild is what makes that guild appear in `listGuilds`.
  ([OAuth2](https://docs.discord.com/developers/topics/oauth2))
- **Privileged intent for members.** `GUILD_MEMBERS` ("Server Members Intent")
  is a privileged intent. "Before you can specify any of these privileged intents
  … you must enable the specific privileged intents you need in the Developer
  Portal" (the **Bot** page). Without it, member-listing endpoints
  (`listMembers`, `searchMembers`) will not return member data. Note the docs
  warn "HTTP API restrictions are independent of Gateway restrictions" — the
  toggle must be on regardless of how you call the API.
  ([Gateway](https://docs.discord.com/developers/events/gateway))

## Error shape

Errors come back as a JSON envelope with `code`, `message`, and (for validation
failures) a nested `errors` object:

```json
{
  "code": 50035,
  "message": "Invalid Form Body",
  "errors": {
    "access_token": {
      "_errors": [
        { "code": "BASE_TYPE_REQUIRED", "message": "This field is required" }
      ]
    }
  }
}
```

`code` is a Discord-specific **JSON error code**, distinct from the HTTP status.
([API Reference](https://docs.discord.com/developers/reference),
[Response Codes](https://docs.discord.com/developers/topics/opcodes-and-status-codes))

Notable JSON error codes
([Response Codes](https://docs.discord.com/developers/topics/opcodes-and-status-codes)):

| code    | meaning                                     | typical cause here                                             |
| ------- | ------------------------------------------- | -------------------------------------------------------------- |
| `10008` | Unknown message                             | wrong/deleted `message_id`, or message in a different channel  |
| `50001` | Missing access                              | bot isn't in the guild/channel, or lacks view access           |
| `50013` | You lack permissions to perform that action | bot missing the required permission (see role hierarchy below) |
| `10014` | Unknown Emoji                               | reaction emoji not URL-encoded, or bad `name:id`               |

HTTP status codes worth handling
([Response Codes](https://docs.discord.com/developers/topics/opcodes-and-status-codes)):
`200` OK, `201` created, `204` no content (many mutating calls return this — the
connector's role/reaction/delete tools surface just `{ status }`), `400` bad
request, `401` missing/invalid `Authorization`, `403` token lacked permission,
`404` resource doesn't exist, `429` rate limited, `502` gateway unavailable
("Wait a bit and retry").

## Snowflake IDs are strings — never coerce

All object IDs (guild, channel, message, user, role, emoji, webhook) are
snowflakes. "Because Snowflake IDs are up to 64 bits in size (e.g. a uint64),
they are always returned as strings in the HTTP API to prevent integer overflows
in some languages." Keep them as strings end-to-end; parsing them into a
number silently corrupts the value.
([API Reference](https://docs.discord.com/developers/reference))

## Channel types — and a thread is a channel

The `type` field on a channel object is a numeric enum
([Channel Resource](https://docs.discord.com/developers/resources/channel)):

| type | name                | note                                    |
| ---- | ------------------- | --------------------------------------- |
| `0`  | GUILD_TEXT          | text channel in a server                |
| `1`  | DM                  | direct message between users            |
| `2`  | GUILD_VOICE         | voice channel                           |
| `3`  | GROUP_DM            | multi-user DM                           |
| `4`  | GUILD_CATEGORY      | organizational category                 |
| `5`  | GUILD_ANNOUNCEMENT  | followable/crosspostable channel        |
| `10` | ANNOUNCEMENT_THREAD | thread under an announcement channel    |
| `11` | PUBLIC_THREAD       | thread under a text or forum channel    |
| `12` | PRIVATE_THREAD      | invite-only thread under a text channel |
| `13` | GUILD_STAGE_VOICE   | stage channel                           |
| `15` | GUILD_FORUM         | "Channel that can only contain threads" |
| `16` | GUILD_MEDIA         | media channel; like forum               |

A **thread is a channel object** — it carries the same `id` shape and is usable
anywhere a `channel_id` is expected (send/list messages, react). Its `parent_id`
points at the channel it lives under. `listChannels` does **not** return threads;
use `listActiveThreads` for those. Forum/media channels can _only_ contain
threads, so posting to them means creating a thread (a forum post), not sending a
plain message.

## Rate limits

- **Global:** "All bots can make up to 50 requests per second to our API."
  ([Rate Limits](https://docs.discord.com/developers/topics/rate-limits))
- **Per-route + per-resource buckets.** "Per-route rate limits exist for many
  individual endpoints, and may include the HTTP method." Some routes share a
  bucket across similar endpoints, "indicated in the `X-RateLimit-Bucket`
  header" — a "unique string denoting the rate limit being encountered." Buckets
  are keyed to the top-level resource (e.g. a specific channel), so limits on one
  channel don't consume another's.
  ([Rate Limits](https://docs.discord.com/developers/topics/rate-limits))
- **On success**, responses carry `X-RateLimit-Limit` (requests allowed),
  `X-RateLimit-Remaining` (requests left), `X-RateLimit-Reset` (epoch seconds when
  it resets), and `X-RateLimit-Reset-After` (seconds until reset, may have
  decimals). Use `Remaining`/`Reset-After` to pace requests before you get a 429.
  ([Rate Limits](https://docs.discord.com/developers/topics/rate-limits))
- **On 429**, the body is `{ message, retry_after, global }` and you should
  "rely on the `Retry-After` header or `retry_after` field to determine when to
  retry." `X-RateLimit-Global` appears only if the global limit was hit;
  `X-RateLimit-Scope` (`user`, `global`, or `shared`) tells you which limit.
  ([Rate Limits](https://docs.discord.com/developers/topics/rate-limits))
- **Invalid-request ban.** IPs making too many invalid requests are temporarily
  blocked: "this limit is 10,000 per 10 minutes" (counting 401/403/429
  responses). Don't hammer a failing endpoint — fix the cause first.
  ([Rate Limits](https://docs.discord.com/developers/topics/rate-limits))

## Pagination

List endpoints page by **snowflake cursor**, not offset. "Snowflake IDs are just
numbers with a timestamp," so `before`/`after`/`around` take a message/object id
and return the neighboring page.
([API Reference](https://docs.discord.com/developers/reference))

- `listChannelMessages`: `before`, `after`, or `around` a message id; `limit`
  1–100 (Discord default 50). Newest-first. To walk history, keep passing the
  oldest id you got as the next `before`.
  ([Message Resource](https://docs.discord.com/developers/resources/message))
- `listMembers` / `listGuilds`: forward-only via `after` set to the last id of
  the previous page. Limits are per-endpoint (members up to 1000, guilds up to
  200 per the connector's input schema).

## Permissions & role hierarchy

Role changes are gated by both a permission **and** the bot's position in the
role hierarchy
([Permissions](https://docs.discord.com/developers/topics/permissions)):

- Managing roles needs `MANAGE_ROLES` ("Allows management and editing of roles").
- Hierarchy: "A bot can grant roles to other users that are of a lower position
  than its own highest role" and "can edit roles of a lower position than its
  highest role." So `addMemberRole`/`removeMemberRole`/`createRole` fail with
  `50013` if the target role sits at or above the bot's top role — even when
  `MANAGE_ROLES` is granted. Move the bot's role above the target.
- Permissions are "stored in a variable-length integer serialized into a string"
  — the `permissions` fields (on roles/guilds) are decimal bitfield **strings**,
  not numbers. Treat them as strings, same rule as snowflakes.

## Bot DM restrictions

`sendDirectMessage` first opens a DM channel via `POST /users/@me/channels` with
a `recipient_id`; "if one already exists, it will be returned instead." Discord
cautions: "You should not use this endpoint to DM everyone in a server about
something. DMs should generally be initiated by a user action. If you open a
significant amount of DMs too quickly, your bot may be rate limited or blocked
from opening new ones." A recipient's privacy settings can also refuse the DM.
([User Resource](https://docs.discord.com/developers/resources/user))

## `/v10` pinning

Every endpoint the connector calls is prefixed with the API version, e.g.
`https://discord.com/api/v10/...`. "You should specify which version to use by
including it in the request path." Behaviors here (string permissions,
`discriminator` of `"0"` on migrated usernames) are v10 semantics; if you call a
different version the shapes can differ.
([API Reference](https://docs.discord.com/developers/reference))
