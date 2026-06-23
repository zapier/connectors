# YouTube Data API — gotchas

Non-obvious behaviors of the YouTube Data API v3 that affect how tools should be
called and how their responses should be interpreted. Every non-trivial claim links
to the public source it was taken from.

## Parts & fields

- Every resource is partitioned into named **parts** (e.g. `snippet`,
  `contentDetails`, `statistics`, `status`). The `part` parameter "is a required
  parameter for any API request that retrieves or returns a resource" and identifies
  which parts the response will include — request a part or its fields will be
  absent. ([overview](https://developers.google.com/youtube/v3/getting-started),
  [videos.list](https://developers.google.com/youtube/v3/docs/videos/list))
- On a **write**, `part` does double duty: it "identifies the properties that the
  write operation will set as well as the properties that the API response will
  include." ([playlists.insert](https://developers.google.com/youtube/v3/docs/playlists/insert))

## Quota & rate limits

- Default allocation is "10,000 units per day combined for all other endpoints,"
  plus separate per-call allowances for the bucketed methods below.
  ([overview](https://developers.google.com/youtube/v3/getting-started),
  [quota guide](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits))
- Cost per call (verbatim "quota cost" from each method's reference page):
  - read / list (videos, channels, playlistItems, commentThreads, videoCategories,
    subscriptions): **1 unit**.
    ([videos.list](https://developers.google.com/youtube/v3/docs/videos/list),
    [playlistItems.list](https://developers.google.com/youtube/v3/docs/playlistItems/list),
    [commentThreads.list](https://developers.google.com/youtube/v3/docs/commentThreads/list),
    [subscriptions.list](https://developers.google.com/youtube/v3/docs/subscriptions/list))
  - write (videos.update, playlists.insert, subscriptions.insert,
    commentThreads.insert, comments.insert, videos.rate, videos.delete): **50 units**.
    ([videos.update](https://developers.google.com/youtube/v3/docs/videos/update),
    [playlists.insert](https://developers.google.com/youtube/v3/docs/playlists/insert),
    [subscriptions.insert](https://developers.google.com/youtube/v3/docs/subscriptions/insert),
    [commentThreads.insert](https://developers.google.com/youtube/v3/docs/commentThreads/insert),
    [comments.insert](https://developers.google.com/youtube/v3/docs/comments/insert),
    [videos.rate](https://developers.google.com/youtube/v3/docs/videos/rate))
  - `thumbnails.set`: "approximately 50 units."
    ([thumbnails.set](https://developers.google.com/youtube/v3/docs/thumbnails/set))
  - `captions.list`: **50 units**; `captions.download`: **200 units** (the
    most expensive read in this catalog).
    ([captions.list](https://developers.google.com/youtube/v3/docs/captions/list),
    [captions.download](https://developers.google.com/youtube/v3/docs/captions/download))
  - `search.list` and `videos.insert` are **no longer charged against the 10,000-unit
    pool**. As of June 1, 2026 the API "is transitioning to a granular quota system …
    starting with `videos.insert` and `search.list`," which "will be charged to their
    own respective quota buckets."
    ([revision history](https://developers.google.com/youtube/v3/revision_history))
    The current per-method pages state `search.list` "has a quota cost of 1 unit in
    the Search Queries quota bucket" and `videos.insert` "has a quota cost of 1 unit in
    the Video Uploads quota bucket."
    ([search.list](https://developers.google.com/youtube/v3/docs/search/list),
    [videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert))
    Note: the upload cost was reduced "from approximately 1600 units to approximately
    100 units" on Dec 4, 2025, then moved to its own bucket — older guidance citing
    1600 units, or search costing 100 units against the main pool, is stale.
    ([revision history](https://developers.google.com/youtube/v3/revision_history))
- When the daily quota is exhausted the API returns `quotaExceeded` (403). The error
  docs describe no `Retry-After` header; treat quota exhaustion as non-retryable until
  the daily reset rather than backing off in a loop.
  ([errors](https://developers.google.com/youtube/v3/docs/errors))

## Errors & recovery

- All errors share Google's standard envelope:
  ```json
  {
    "error": {
      "errors": [{ "domain": "...", "reason": "...", "message": "..." }],
      "code": 400,
      "message": "..."
    }
  }
  ```
  The actionable signal is `error.errors[0].reason`.
  ([error format](https://developers.google.com/youtube/v3/docs/core_errors))
- `quotaExceeded` (403): "The request cannot be completed because you have exceeded
  your quota." → stop; do not retry until quota resets.
  ([errors](https://developers.google.com/youtube/v3/docs/errors))
- `insufficientPermissions` (403): "The OAuth 2.0 token provided for the request
  specifies scopes that are insufficient for accessing the requested data." →
  reconnect with the scope the operation needs.
  ([errors](https://developers.google.com/youtube/v3/docs/errors))
- `forbidden` (403): "Access forbidden. The request may not be properly authorized."
  → either a missing scope or you do not own the resource (reconnecting won't fix
  ownership). ([errors](https://developers.google.com/youtube/v3/docs/errors))
- `notFound` (404): the identified resource "cannot be found" → verify the id.
  ([errors](https://developers.google.com/youtube/v3/docs/errors))
- `authorizationRequired` (401): e.g. "The request uses the `mine` parameter but is
  not properly authorized." → reconnect.
  ([errors](https://developers.google.com/youtube/v3/docs/errors))
- `subscriptionDuplicate` (400): "The subscription that you are trying to create
  already exists." This is a post-condition-satisfied state, not a hard failure — the
  user is already subscribed.
  ([subscriptions.insert](https://developers.google.com/youtube/v3/docs/subscriptions/insert))
- Thumbnail uploads can return `uploadRateLimitExceeded` (429): "The channel has
  uploaded too many thumbnails recently. Please try the request again later." →
  short-term back-off. ([thumbnails.set](https://developers.google.com/youtube/v3/docs/thumbnails/set))

## OAuth scopes & ownership

Scope descriptions (from the consent screen):

- `youtube.readonly` — "View your YouTube account."
- `youtube` — "Manage your YouTube account."
- `youtube.upload` — "Manage your YouTube videos."
- `youtube.force-ssl` — "See, edit, and permanently delete your YouTube videos,
  ratings, comments and captions."
  ([scopes](https://developers.google.com/youtube/v3/guides/auth/installed-apps))

- **Comment and caption writes require `youtube.force-ssl`.** `commentThreads.insert`,
  `comments.insert`, `captions.list`, and `captions.download` all list
  `youtube.force-ssl` among their accepted scopes.
  ([commentThreads.insert](https://developers.google.com/youtube/v3/docs/commentThreads/insert),
  [comments.insert](https://developers.google.com/youtube/v3/docs/comments/insert),
  [captions.list](https://developers.google.com/youtube/v3/docs/captions/list),
  [captions.download](https://developers.google.com/youtube/v3/docs/captions/download))
- **Uploads and thumbnails accept `youtube.upload`.** `videos.insert` and
  `thumbnails.set` both list `youtube.upload`.
  ([videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert),
  [thumbnails.set](https://developers.google.com/youtube/v3/docs/thumbnails/set))
- **Ownership:** downloading a caption track "requires the user to have permission to
  edit the video" (the video's owner or an editor), not merely read access.
  ([captions.download](https://developers.google.com/youtube/v3/docs/captions/download))
  `textOriginal` for a comment "is only returned to the authenticated user if they are
  the comment's author."
  ([comments resource](https://developers.google.com/youtube/v3/docs/comments))

## Pagination

- List methods return `nextPageToken` which "identifies the next page of the result
  that can be retrieved"; pass it back as `pageToken`. When it is absent, there are no
  more pages. ([commentThreads.list](https://developers.google.com/youtube/v3/docs/commentThreads/list))
- `maxResults` caps differ by resource:
  - search, playlistItems, subscriptions: 0–50, default 5.
    ([search.list](https://developers.google.com/youtube/v3/docs/search/list),
    [playlistItems.list](https://developers.google.com/youtube/v3/docs/playlistItems/list),
    [subscriptions.list](https://developers.google.com/youtube/v3/docs/subscriptions/list))
  - commentThreads: 1–100, default 20.
    ([commentThreads.list](https://developers.google.com/youtube/v3/docs/commentThreads/list))

## IDs

- A `playlistItem` id is distinct from the video id it points to — use the
  playlistItem id to remove an item.
- A `subscription` id is distinct from the channel id — use the subscription id to
  unsubscribe.
- `channels.list` `id` "specifies a comma-separated list of the YouTube channel ID(s)."
  ([channels.list](https://developers.google.com/youtube/v3/docs/channels/list))

## Statistics (counts as strings)

- Count fields are typed `unsigned long` and come back as JSON **strings**, not
  numbers: `viewCount`, `likeCount`, `commentCount` (videos), and `viewCount`,
  `subscriberCount`, `videoCount` (channels). Do not coerce blindly.
  ([videos resource](https://developers.google.com/youtube/v3/docs/videos),
  [channels resource](https://developers.google.com/youtube/v3/docs/channels))
- `channels` `subscriberCount` "is rounded down to three significant figures," and
  `hiddenSubscriberCount` "Indicates whether the channel's subscriber count is publicly
  visible" — when hidden, treat `subscriberCount` as unavailable.
  ([channels resource](https://developers.google.com/youtube/v3/docs/channels))
- `channels` `videoCount` "reflects the count of the channel's public videos only,
  even to owners." ([channels resource](https://developers.google.com/youtube/v3/docs/channels))

## Per-resource notes

### Videos

- `contentDetails.duration` is an ISO 8601 duration, e.g. `PT15M33S` for 15 min 33 s.
  ([videos resource](https://developers.google.com/youtube/v3/docs/videos))
- `contentDetails.caption` is the **string** `"true"` or `"false"`, not a boolean.
  ([videos resource](https://developers.google.com/youtube/v3/docs/videos))
- `status.uploadStatus` ∈ {`deleted`, `failed`, `processed`, `rejected`, `uploaded`};
  `status.privacyStatus` ∈ {`private`, `public`, `unlisted`}.
  ([videos resource](https://developers.google.com/youtube/v3/docs/videos))
- `status.publishAt` (scheduled publish) "can be set only if the privacy status of the
  video is private." ([videos resource](https://developers.google.com/youtube/v3/docs/videos))
- COPPA: `selfDeclaredMadeForKids` lets the channel owner "designate the video as being
  child-directed" on insert/update; `madeForKids` is the resulting status.
  ([videos resource](https://developers.google.com/youtube/v3/docs/videos))
- **`videos.update` replaces, it does not merge.** "this method will override the
  existing values for all of the mutable properties that are contained in any parts
  that the parameter value specifies," and "if your request does not specify a value
  for a property that already has a value, the property's existing value will be
  deleted." Read the current resource, modify, then write back the whole part.
  ([videos.update](https://developers.google.com/youtube/v3/docs/videos/update))
- `videos.update` with a `snippet` part requires `snippet.title` and
  `snippet.categoryId`.
  ([videos.update](https://developers.google.com/youtube/v3/docs/videos/update))
- `videos.insert` `notifySubscribers` default "is True."
  ([videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert))
- A video title "has a character limit of 100 characters and cannot include invalid
  characters." ([title limits, Help Center](https://support.google.com/youtube/answer/57404))
- `videos.rate` returns "an HTTP `204` response code (`No Content`)" — empty body on
  success; `rating` ∈ {`like`, `dislike`, `none`}.
  ([videos.rate](https://developers.google.com/youtube/v3/docs/videos/rate))

### Search

- A `search.list` result resource contains only `kind`, `etag`, `id`, and `snippet` —
  no `statistics` or `contentDetails`. The `snippet` "contains basic details about a
  search result, such as its title or description"; call `getVideo` (videos.list) when
  you need view counts, duration, or other full-resource fields.
  ([searchResult resource](https://developers.google.com/youtube/v3/docs/search))
- `order` ∈ {`date`, `rating`, `relevance` (default), `title`, `videoCount`,
  `viewCount`}; `publishedAfter`/`publishedBefore` take RFC 3339 date-times;
  `relevanceLanguage` is an ISO 639-1 two-letter code.
  ([search.list](https://developers.google.com/youtube/v3/docs/search/list))

### Playlists

- `status.privacyStatus` ∈ {`private`, `public`, `unlisted`}; no default is documented
  in the API reference.
  ([playlists resource](https://developers.google.com/youtube/v3/docs/playlists))
- `playlistItems.list` `maxResults` is 0–50 (default 5).
  ([playlistItems.list](https://developers.google.com/youtube/v3/docs/playlistItems/list))

### Comments

- `textDisplay` "can be retrieved in either plain text or HTML" and "may differ from
  the original comment text. For example, it may replace video links with video
  titles." `textOriginal` is "the original, raw text." Control format via
  `commentThreads.list`'s `textFormat` (`html` default, or `plainText`).
  ([comments resource](https://developers.google.com/youtube/v3/docs/comments),
  [commentThreads.list](https://developers.google.com/youtube/v3/docs/commentThreads/list))
- To create a top-level comment use `commentThreads.insert`; `comments.insert` "handles
  replies to existing comments, requiring the `snippet.parentId` property."
  ([comments.insert](https://developers.google.com/youtube/v3/docs/comments/insert))

### Captions

- `snippet.trackKind` ∈ {`standard` (a regular caption track, the default), `ASR`
  (generated by automatic speech recognition), `forced`}; `snippet.status` ∈
  {`serving`, `syncing`, `failed`}; `snippet.language` is a BCP-47 tag.
  ([captions resource](https://developers.google.com/youtube/v3/docs/captions))
- `captions.download` `tfmt` ∈ {`sbv`, `scc`, `srt`, `ttml`, `vtt`}; `tlang` requests a
  machine translation (ISO 639-1 code). Returns a raw caption file body, not JSON.
  ([captions.download](https://developers.google.com/youtube/v3/docs/captions/download))
- Insufficient permission to download a track returns 403: "The permissions associated
  with the request are not sufficient to download the caption track."
  ([captions.download](https://developers.google.com/youtube/v3/docs/captions/download))

### Channels

- Resolve the authenticated user's channel with `mine=true`; look up others with `id`
  (comma-separated) or `forHandle` ("a YouTube handle … can be prepended with an `@`
  symbol"). ([channels.list](https://developers.google.com/youtube/v3/docs/channels/list))
- A channel's uploads playlist is `contentDetails.relatedPlaylists.uploads` — "The ID
  of the playlist that contains the channel's uploaded videos." Pass it to
  `playlistItems.list` to enumerate a channel's videos.
  ([channels resource](https://developers.google.com/youtube/v3/docs/channels))

### Subscriptions

- `subscriptions.list` `forChannelId` "specifies a comma-separated list of channel
  IDs" to filter by; combine with `mine=true` to check whether the user is subscribed
  to a specific channel.
  ([subscriptions.list](https://developers.google.com/youtube/v3/docs/subscriptions/list))

### Video categories

- Only categories whose `snippet.assignable` is true can be set on a video —
  `assignable` "Indicates whether videos can be associated with the category."
  ([videoCategories resource](https://developers.google.com/youtube/v3/docs/videoCategories))
- Categories are region-specific; `videoCategories.list` is queried by `regionCode`.
  ([videoCategories.list](https://developers.google.com/youtube/v3/docs/videoCategories/list))

### Thumbnails

- `thumbnails.set` accepts `image/jpeg`, `image/png` (and
  `application/octet-stream`) with a "Maximum file size: 2MB."
  ([thumbnails.set](https://developers.google.com/youtube/v3/docs/thumbnails/set))
- A 403 forbidden is returned when "The authenticated user doesn't have permissions to
  upload and set custom video thumbnails" — observed in practice for accounts that are
  not verified, though the API docs phrase this as a permissions, not a "verified",
  check. ([thumbnails.set](https://developers.google.com/youtube/v3/docs/thumbnails/set))
