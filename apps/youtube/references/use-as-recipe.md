# Using YouTube as a recipe (write-your-own-code)

This is the no-tooling shape: you cannot load this package's tools, run a
terminal/subprocess, or `import` this package in-process. You have only your
own code-execution environment (e.g. a code-execution sandbox) and outbound
HTTP. This file teaches you enough about the YouTube Data API v3's request and
response shapes to write equivalent calls yourself, in whatever language your
sandbox runs.

This is **not** a copy of the vendor's full reference. Every claim here about
how the API actually _behaves_ (quotas, error semantics, scopes, id
relationships, field quirks) is a pointer into
[`youtube-api-gotchas.md`](youtube-api-gotchas.md) — load that file before you
rely on any of those specifics. What's shown inline here is structural only:
HTTP method, path, and field name/type — the mechanics you need to construct a
valid request, derived directly from this connector's own public
`scripts/*.ts`.

## Auth & base URL mechanics

- Base URL: `https://www.googleapis.com/youtube/v3/`. Every operation below is
  `<base>/<resource>` (e.g. `<base>/videos`, `<base>/playlistItems`), with one
  path-parameterized exception (`captions/<id>` for download).
- Every request needs a Google OAuth 2.0 access token for the authenticated
  account, attached the standard OAuth 2.0 way (bearer credential in the
  request's auth header). What that token is _allowed_ to do is gated by
  **scope** (granted at consent) and by **resource ownership** — see
  [`youtube-api-gotchas.md#oauth-scopes--ownership`](youtube-api-gotchas.md#oauth-scopes--ownership)
  for which scope each operation family needs and what an ownership failure
  looks like.
- `part` is a parameter you set on nearly every call (both reads and writes) —
  it selects which named sub-objects (`snippet`, `contentDetails`,
  `statistics`, `status`, ...) the request touches. Mechanics of _why_ are in
  [`youtube-api-gotchas.md#parts--fields`](youtube-api-gotchas.md#parts--fields);
  the shapes below show which parts each operation family typically reads or
  writes.

## Request pattern (mechanism)

Every call is a plain HTTP request against `<base>/<resource>`:

- **Reads** (`GET`) — build the URL, set query parameters for whichever
  optional inputs are actually provided (an omitted optional input means the
  query param is omitted, not sent empty), then parse the JSON body.
- **Writes that create/replace a resource** (`POST` for insert, `PUT` for
  update) — set `part` as a query parameter, and send a JSON body containing
  only the top-level parts you're writing (e.g. `{ snippet, status }`). The
  body is a plain object matching the resource shape below — the request only
  contains what your code puts in it, so if you're changing one field of a
  multi-field part, decide up front whether you need to read the current
  resource first to carry forward the fields you're not touching.
- **Deletes** (`DELETE`) — the target id goes in the query string (`id=` or
  the resource-specific id param below), no body.

```text
GET    <base>/<resource>?part=...&<filters>&maxResults=...&pageToken=...
POST   <base>/<resource>?part=...          body: { <part>: {...} }
PUT    <base>/<resource>?part=...          body: { id, <part>: {...} }
DELETE <base>/<resource>?id=<id>
```

## Response envelope & pagination (mechanism)

Reads that return a page respond with:

```text
{
  items: [ <resource>, ... ],
  nextPageToken?: string
}
```

To page forward, take `nextPageToken` from a response and pass it back as the
`pageToken` query parameter on the next call. The exact contract for when it's
present/absent and the per-resource result caps are vendor-documented — see
[`youtube-api-gotchas.md#pagination`](youtube-api-gotchas.md#pagination).

Writes that create or replace a resource respond with the resource itself
(same shape as the matching read). Operations with no response body
(`videos.rate`, and the delete/unsubscribe/remove family) respond with an
empty body on success — your code should treat "2xx, empty body" as success
rather than trying to parse JSON out of it.

`captions` download is the one exception: it returns the caption file's raw
text (not JSON) in the format you requested.

## Error handling pattern (mechanism)

Every non-2xx response shares one envelope:

```text
{
  error: {
    code: number,
    message: string,
    errors: [ { domain?: string, reason?: string, message?: string } ]
  }
}
```

Pattern: check the HTTP status; on failure, parse the body as JSON (falling
back to raw text if it isn't JSON — some failure modes return an empty or
non-JSON body) and read `error.errors[0].reason` as the actionable signal —
it's more specific than the HTTP status alone. Branch your recovery on that
`reason` string (reconnect vs. wait vs. back off vs. give up), not on
inventing your own logic — the exact reason→recovery mapping (`quotaExceeded`,
`insufficientPermissions`, `forbidden`, `notFound`, `subscriptionDuplicate`,
etc.) is documented in
[`youtube-api-gotchas.md#errors--recovery`](youtube-api-gotchas.md#errors--recovery).

Two operations turn a specific error `reason` into a non-error outcome rather
than propagating it — build the same special-casing yourself if you replicate
them:

- **Subscribing to an already-subscribed channel** — the insert call can come
  back with a `reason` meaning the subscription already exists. Treat that as
  success: look the existing subscription up (list, filtered to that channel)
  and use its id, rather than surfacing a failure for a state the caller
  already wanted.
- **Replying with the wrong parent** — replying to a reply (instead of a
  top-level thread) comes back with a `reason` meaning the operation isn't
  supported. Surface that as "your parent id must be a top-level thread id,"
  not the raw upstream text.

The exact `reason` strings for both are in
[`youtube-api-gotchas.md#errors--recovery`](youtube-api-gotchas.md#errors--recovery).

## Operation families

Field shapes below are structural — field name and type only. Enum-typed
fields whose accepted values are vendor-documented are marked "constrained,
see gotchas" rather than listing values here; treat any concrete value you use
as something you look up at gotchas.md, not something to guess.

### Videos — get / update / delete / rate

- **Get**: `GET /videos?part=<parts>&id=<one-or-more-comma-separated>`. Response
  item shape:
  ```text
  {
    id: string,
    snippet?: { title, description, channelId, channelTitle, publishedAt,
                tags: string[], categoryId, defaultLanguage,
                defaultAudioLanguage, liveBroadcastContent, thumbnails },
    contentDetails?: { duration, definition, caption, licensedContent },
    statistics?: { viewCount, likeCount, commentCount, favoriteCount },
    status?: { uploadStatus, privacyStatus, publishAt, madeForKids, license }
  }
  ```
  `contentDetails`/`statistics`/`status` field semantics (duration format,
  counts, status enums) are vendor behavior — see
  [`youtube-api-gotchas.md#videos`](youtube-api-gotchas.md#videos) and
  [`youtube-api-gotchas.md#statistics-counts-as-strings`](youtube-api-gotchas.md#statistics-counts-as-strings).
- **Update**: `PUT /videos?part=snippet,status` with body
  `{ id, snippet: {...}, status: {...} }`. This is a read-modify-write, not a
  single call: get the video first (same shape as above), merge only the
  fields you're changing onto the current `snippet`/`status`, then PUT the
  full merged object back — omitted fields inside a written part are not
  preserved by the API itself. Why that's necessary, and the two fields the
  API requires on every snippet write, are documented at
  [`youtube-api-gotchas.md#videos`](youtube-api-gotchas.md#videos).
- **Delete**: `DELETE /videos?id=<id>`. Empty body on success.
- **Rate**: `POST /videos/rate?id=<id>&rating=<value>`. `rating` is
  constrained (see gotchas). Empty body on success — your code has to
  synthesize its own success signal rather than reading one from the
  response.

### Search

- `GET /search?part=<parts>&q=...&type=...&channelId=...&forMine=...&order=...&publishedAfter=...&publishedBefore=...&videoDuration=...&regionCode=...&relevanceLanguage=...&maxResults=...&pageToken=...`
  — every filter except `part`/`type` is optional; omit rather than send
  empty. `order` is constrained (see gotchas). `videoDuration` and
  `relevanceLanguage` are plain strings from a small accepted set / language
  code — don't guess a value, confirm it against the live API or your own
  prior successful calls.
- Response items are lightweight — **not** the same shape as a `videos` get:
  ```text
  {
    id?: { kind, videoId?, channelId?, playlistId? },
    snippet?: { title, description, channelId, channelTitle, publishedAt,
                liveBroadcastContent, thumbnails }
  }
  ```
  No `statistics` or `contentDetails` on a search hit — call the videos get
  operation above with the returned `id.videoId` when you need those. Search
  sits in its own quota accounting, separate from the rest of the catalog —
  see
  [`youtube-api-gotchas.md#quota--rate-limits`](youtube-api-gotchas.md#quota--rate-limits)
  and
  [`youtube-api-gotchas.md#search`](youtube-api-gotchas.md#search).

### Playlists — list / create / update / delete

- **List**: `GET /playlists?part=<parts>&mine=...|channelId=...|id=...&maxResults=...&pageToken=...`
  — `mine`, `channelId`, and `id` are alternative selectors, not combinable.
- **Create**: `POST /playlists?part=snippet,status` with body
  `{ snippet: { title, description?, defaultLanguage? }, status?: { privacyStatus } }`.
  `privacyStatus` is constrained (see gotchas).
- **Update**: `PUT /playlists?part=snippet,status` with body
  `{ id, snippet: {...}, status?: {...} }`. Unlike the video update above,
  this call does not read-first for you — build the complete `snippet` object
  you want (title is required on every write), since the API only receives
  what's in your body.
- **Delete**: `DELETE /playlists?id=<id>`.
- Response/resource shape (list, create, update):
  ```text
  {
    id: string,
    snippet?: { title, description, channelId, channelTitle, publishedAt, thumbnails },
    status?: { privacyStatus },
    contentDetails?: { itemCount: number }
  }
  ```
  Default privacy behavior and the id relationships to playlist items are
  vendor-documented — see
  [`youtube-api-gotchas.md#playlists`](youtube-api-gotchas.md#playlists) and
  [`youtube-api-gotchas.md#ids`](youtube-api-gotchas.md#ids).

### Playlist items — list / add / remove

- **List**: `GET /playlistItems?part=<parts>&playlistId=<id>&maxResults=...&pageToken=...`.
- **Add**: `POST /playlistItems?part=snippet` with body
  `{ snippet: { playlistId, resourceId: { kind: "youtube#video", videoId }, position? } }`.
  `position` is a 0-based integer; omit to append.
- **Remove**: `DELETE /playlistItems?id=<playlistItem-id>` — this id is the
  playlist item's own id, distinct from the video id; see
  [`youtube-api-gotchas.md#ids`](youtube-api-gotchas.md#ids).
- Resource shape (list, add):
  ```text
  {
    id: string,
    snippet?: { playlistId, position: number, title, description, channelId,
                channelTitle, publishedAt, resourceId: { kind, videoId?, channelId? },
                thumbnails },
    contentDetails?: { videoId, videoPublishedAt },
    status?: { privacyStatus }
  }
  ```

### Comments — list / post / reply

- **List**: `GET /commentThreads?part=<parts>&videoId=<id>&order=...&searchTerms=...&maxResults=...&pageToken=...`.
  `order` is a small fixed set of sort strings; confirm the value you intend
  to use rather than guessing.
- **Post (new top-level comment)**: `POST /commentThreads?part=snippet` with
  body `{ snippet: { videoId, topLevelComment: { snippet: { textOriginal } } } }`.
- **Reply**: `POST /comments?part=snippet` with body
  `{ snippet: { parentId, textOriginal } }` — a **different** resource
  (`comments`, not `commentThreads`) from posting a new top-level comment.
  `parentId` must be a top-level thread id; see the error-handling section
  above and
  [`youtube-api-gotchas.md#comments`](youtube-api-gotchas.md#comments) for why.
- Shapes:
  ```text
  // CommentThread (list, post)
  {
    id: string,
    snippet?: { videoId, totalReplyCount: number, isPublic: boolean, topLevelComment?: Comment },
    replies?: { comments?: Comment[] }
  }
  // Comment (embedded in a thread, and the reply response)
  {
    id: string,
    snippet?: { textDisplay, textOriginal, authorDisplayName,
                authorChannelId?: { value }, likeCount: number,
                publishedAt, updatedAt, parentId }
  }
  ```
  `textDisplay` vs. `textOriginal`, and when each is visible to whom, is
  vendor behavior — see
  [`youtube-api-gotchas.md#comments`](youtube-api-gotchas.md#comments).

### Channels — get

- `GET /channels?part=<parts>&mine=true|id=<ids>|forHandle=<handle>` — the
  three selectors are mutually exclusive; pick exactly one.
- Response item shape:
  ```text
  {
    id: string,
    snippet?: { title, description, customUrl, publishedAt, country, thumbnails },
    contentDetails?: { relatedPlaylists?: { uploads: string, likes: string } },
    statistics?: { viewCount, subscriberCount, hiddenSubscriberCount: boolean, videoCount }
  }
  ```
  `contentDetails.relatedPlaylists.uploads` is the id you feed into the
  playlist-items list operation to enumerate a channel's videos. Count-field
  and visibility semantics — see
  [`youtube-api-gotchas.md#channels`](youtube-api-gotchas.md#channels) and
  [`youtube-api-gotchas.md#statistics-counts-as-strings`](youtube-api-gotchas.md#statistics-counts-as-strings).

### Video categories — list

- `GET /videoCategories?part=snippet&regionCode=<alpha-2-country-code>`.
- Response item shape:
  ```text
  { id: string, snippet?: { title, assignable: boolean } }
  ```
  Only categories with `assignable: true` can be set on a video, and the set
  varies by region — see
  [`youtube-api-gotchas.md#video-categories`](youtube-api-gotchas.md#video-categories).

### Subscriptions — list / subscribe / unsubscribe

- **List**: `GET /subscriptions?part=<parts>&mine=true&forChannelId=...&order=...&maxResults=...&pageToken=...`.
  `forChannelId` narrows to a subscription for one specific channel — useful
  for a subscribed/not-subscribed check. `order` is a small fixed set of sort
  strings.
- **Subscribe**: `POST /subscriptions?part=snippet` with body
  `{ snippet: { resourceId: { kind: "youtube#channel", channelId } } }`. See
  the error-handling section above for the already-subscribed soft-success
  case.
- **Unsubscribe**: `DELETE /subscriptions?id=<subscription-id>` — this id is
  the subscription's own id, distinct from the channel id; see
  [`youtube-api-gotchas.md#ids`](youtube-api-gotchas.md#ids).
- Resource shape (list, subscribe):
  ```text
  {
    id: string,
    snippet?: { title, description, publishedAt,
                resourceId: { kind, videoId?, channelId? }, thumbnails },
    contentDetails?: { totalItemCount: number, newItemCount: number }
  }
  ```

### Captions — list / download

- **List**: `GET /captions?part=snippet&videoId=<id>`. Response item shape:
  ```text
  {
    id: string,
    snippet?: { videoId, language, name, trackKind, status,
                isAutoSynced: boolean, lastUpdated }
  }
  ```
  `trackKind`/`status` are constrained (see gotchas).
- **Download**: `GET /captions/<caption-track-id>?tfmt=<format>&tlang=<lang>?`.
  `tfmt` is constrained (see gotchas); `tlang` requests a machine translation
  and is optional. The response body is the raw caption file's **text**, not
  JSON — read it as text, don't try to parse it. Permission requirements for
  downloading a track are vendor-documented — see
  [`youtube-api-gotchas.md#captions`](youtube-api-gotchas.md#captions) and
  [`youtube-api-gotchas.md#oauth-scopes--ownership`](youtube-api-gotchas.md#oauth-scopes--ownership).

## Critical rules

Everything below is vendor behavior, not mechanism — load the linked section
before depending on it:

- **Parts model** (what `part` controls on reads and writes) —
  [`youtube-api-gotchas.md#parts--fields`](youtube-api-gotchas.md#parts--fields)
- **Quota accounting per operation, and what happens when it's exhausted** —
  [`youtube-api-gotchas.md#quota--rate-limits`](youtube-api-gotchas.md#quota--rate-limits)
- **Error envelope's `reason` → what to actually do about it** —
  [`youtube-api-gotchas.md#errors--recovery`](youtube-api-gotchas.md#errors--recovery)
- **Which scope each write/read family needs, and ownership vs. scope
  failures** —
  [`youtube-api-gotchas.md#oauth-scopes--ownership`](youtube-api-gotchas.md#oauth-scopes--ownership)
- **`nextPageToken`/`pageToken` contract and per-resource result caps** —
  [`youtube-api-gotchas.md#pagination`](youtube-api-gotchas.md#pagination)
- **Which ids are distinct from the "obvious" one** (playlist item vs. video,
  subscription vs. channel) —
  [`youtube-api-gotchas.md#ids`](youtube-api-gotchas.md#ids)
- **Counts come back as strings, and when they're hidden/rounded** —
  [`youtube-api-gotchas.md#statistics-counts-as-strings`](youtube-api-gotchas.md#statistics-counts-as-strings)
- **Per-resource quirks** — videos (replace-not-merge, required fields on
  write, COPPA fields, rating semantics):
  [`youtube-api-gotchas.md#videos`](youtube-api-gotchas.md#videos); search
  (result shape, ordering):
  [`youtube-api-gotchas.md#search`](youtube-api-gotchas.md#search); playlists:
  [`youtube-api-gotchas.md#playlists`](youtube-api-gotchas.md#playlists);
  comments (display vs. original text, thread vs. reply insert path):
  [`youtube-api-gotchas.md#comments`](youtube-api-gotchas.md#comments);
  captions (format/translation, ownership requirement to download):
  [`youtube-api-gotchas.md#captions`](youtube-api-gotchas.md#captions);
  channels (selector rules, uploads playlist):
  [`youtube-api-gotchas.md#channels`](youtube-api-gotchas.md#channels);
  subscriptions (filtering by channel):
  [`youtube-api-gotchas.md#subscriptions`](youtube-api-gotchas.md#subscriptions);
  video categories (assignability, region-scoping):
  [`youtube-api-gotchas.md#video-categories`](youtube-api-gotchas.md#video-categories).

**Before writing** against a video, playlist, or channel you resolved by
name, apply the same disambiguation discipline this connector uses in every
other shape: an exact single title match acts, two or more tied matches means
stop and ask — never write to an arbitrarily-picked one. See
[`../SKILL.md#disambiguation--refusals`](../SKILL.md#disambiguation--refusals).

## What this catalog doesn't cover

Writing your own calls doesn't expand the surface — there is no public
operation in this catalog (and nothing documented above) for analytics
(views-over-time, watch-time, revenue, demographics), comment moderation
(edit/delete/hide/spam-flag), live-stream management, caption upload/replace,
video upload or thumbnail-setting (binary media upload), or channel
administration (branding/sections/settings). If you're tempted to approximate
one of these with a call shown above, don't — tell the caller it's
unsupported instead.

## Where to go next

- [`youtube-api-gotchas.md`](youtube-api-gotchas.md) — the full vendor-behavior
  reference every pointer above links into:
  [Parts & fields](youtube-api-gotchas.md#parts--fields) ·
  [Quota & rate limits](youtube-api-gotchas.md#quota--rate-limits) ·
  [Errors & recovery](youtube-api-gotchas.md#errors--recovery) ·
  [OAuth scopes & ownership](youtube-api-gotchas.md#oauth-scopes--ownership) ·
  [Pagination](youtube-api-gotchas.md#pagination) ·
  [IDs](youtube-api-gotchas.md#ids) ·
  [Statistics (counts as strings)](youtube-api-gotchas.md#statistics-counts-as-strings) ·
  [Videos](youtube-api-gotchas.md#videos) ·
  [Search](youtube-api-gotchas.md#search) ·
  [Playlists](youtube-api-gotchas.md#playlists) ·
  [Comments](youtube-api-gotchas.md#comments) ·
  [Captions](youtube-api-gotchas.md#captions) ·
  [Channels](youtube-api-gotchas.md#channels) ·
  [Subscriptions](youtube-api-gotchas.md#subscriptions) ·
  [Video categories](youtube-api-gotchas.md#video-categories)
- [`../SKILL.md`](../SKILL.md) — the connector overview: full script catalog,
  auth/scope model, output-format conventions (not applicable when you call
  the vendor API directly, since you're bypassing this package entirely), and
  the disambiguation/refusal rules referenced above.
