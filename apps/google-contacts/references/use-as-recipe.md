# Using Google Contacts as a recipe (write your own code)

This is the write-your-own-code shape: you have no pre-registered tools, no
terminal/subprocess access, and no way to `import` this package (e.g. a
code-execution sandbox that runs a snippet you author). You won't call this
connector at all — you'll write code that calls the Google People API
directly over HTTPS. This doc teaches you the request/response shapes and
error handling this connector's own scripts use, so you can reproduce the
same behavior in your own snippet.

## Auth & base URL

Every request is plain HTTPS to `https://people.googleapis.com/v1`, with:

- `Authorization: Bearer <access-token>` — a Google OAuth 2.0 access token.
  How you obtain that token is up to your host/platform; nothing about the
  token format is specific to this connector.
- `Content-Type: application/json` on every request that has a body.

The scope your token was granted determines what you can do: contact writes
need Google's `contacts` scope; the other-contacts read tools need
`contacts.other.readonly`. What each HTTP status/scope failure means and how
to recover is already written up — see
[Error envelope](google-contacts-api-gotchas.md#error-envelope) and
[Other contacts](google-contacts-api-gotchas.md#other-contacts) in the
gotchas doc rather than re-deriving it here.

## Request/response shape patterns

Shapes below are structural (field name + type), taken directly from this
connector's own request-building code — not a claim about exact vendor
limits, enums, or ids. Where a real limit/format matters, it's covered in
[Critical rules](#critical-rules) below via a pointer to the gotchas doc.

### The Person resource (shared by every contact-returning call)

```
Person {
  resourceName: string          // e.g. "people/<id>"
  etag?: string                 // optimistic-concurrency token
  names?: Name[]
  emailAddresses?: EmailAddress[]
  phoneNumbers?: PhoneNumber[]
  addresses?: Address[]
  organizations?: Organization[]
  biographies?: Biography[]
  birthdays?: Birthday[]
  urls?: Url[]
  events?: ContactEvent[]
  relations?: Relation[]
  userDefined?: { key: string, value: string }[]
  nicknames?: { value?: string }[]
  occupations?: { value?: string }[]
  memberships?: { contactGroupMembership?: { contactGroupResourceName?: string } }[]
  photos?: { url?: string, default?: boolean }[]
}

Name            { givenName?, familyName?, middleName?, honorificPrefix?, honorificSuffix?,
                  unstructuredName?: string, displayName?: string /* read-only */,
                  displayNameLastFirst?: string /* read-only */ }
EmailAddress    { value: string, type?: string }        // type is free text, not a fixed enum
PhoneNumber     { value: string, type?: string }        // free text
Address         { streetAddress?, extendedAddress?, city?, region?, postalCode?, country?,
                  countryCode?, poBox?, type?: string }  // all string
Organization    { name?, title?, department?, type?: string }
Biography       { value: string, contentType?: "TEXT_PLAIN" | "TEXT_HTML" }
Birthday        { date?: { year?: number, month?: number, day?: number }, text?: string }
Url             { value: string, type?: string }
ContactEvent    { date?: { year?, month?, day? }, type?: string }
Relation        { person: string, type?: string }
```

`Name.displayName` / `displayNameLastFirst` are computed by the API — don't
send them back on a write.

### Contact CRUD

| Operation | Request                                                                                                                                                                                                          | Response         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Create    | `POST /people:createContact?personFields=<mask>` — body is a partial `Person` (any subset of the writable arrays above, plus optional `memberships: [{ contactGroupMembership: { contactGroupResourceName } }]`) | `Person`         |
| Get       | `GET /{resourceName}?personFields=<mask>` — `resourceName` is `people/<id>`, interpolated as-is (the slash is part of the path, not a query value)                                                               | `Person`         |
| Update    | `PATCH /{resourceName}:updateContact?updatePersonFields=<mask>&personFields=<mask>` — body is `{ etag, ...fields }`                                                                                              | `Person`         |
| Delete    | `DELETE /{resourceName}:deleteContact` — no body                                                                                                                                                                 | empty on success |

Building the request body: include a key only for a section you actually
have data for; don't send an empty array or empty object for a section you
don't want to touch — omit the key entirely. The `updatePersonFields` /
`personFields` query values are comma-separated field-name lists, built from
whichever sections you're sending (for updates) or want back (for reads).

`updateContact` is a read-then-write: `GET` the contact first with
`personFields=metadata` to obtain the current `etag`, then `PATCH` with that
`etag` plus your changed sections. If you edit any of the `Name` parts,
rebuild `unstructuredName` from the parts you have (join non-empty
`honorificPrefix`, `givenName`, `middleName`, `familyName`,
`honorificSuffix` with spaces) so the display name doesn't go stale — the
API does not do this for you when only parts change.

### Listing & search

| Operation | Request                                                                                             | Response                                                                   |
| --------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| List      | `GET /people/me/connections?personFields=<mask>&sortOrder=<enum>&pageSize=<int>&pageToken=<string>` | `{ connections?: Person[], nextPageToken?: string, totalPeople?: number }` |
| Search    | `GET /people:searchContacts?query=<string>&readMask=<mask>&pageSize=<int>`                          | `{ results?: { person?: Person }[] }`                                      |

`sortOrder` (list only) is one of `LAST_MODIFIED_ASCENDING`,
`LAST_MODIFIED_DESCENDING`, `FIRST_NAME_ASCENDING`, `LAST_NAME_ASCENDING`.
Search has no `pageToken` in or cursor out — there is nothing to paginate
against.

### Contact photos

| Operation   | Request                                                                                                   | Response              |
| ----------- | --------------------------------------------------------------------------------------------------------- | --------------------- |
| Set/replace | `PATCH /{resourceName}:updateContactPhoto` — body `{ photoBytes: <base64 string>, personFields: <mask> }` | `{ person?: Person }` |
| Remove      | `DELETE /{resourceName}:deleteContactPhoto?personFields=<mask>`                                           | `{ person?: Person }` |

`photoBytes` is the raw image bytes, base64-encoded as a string — not a URL
and not a file path.

### Contact groups (labels)

```
ContactGroup {
  resourceName: string          // e.g. "contactGroups/<id>"
  etag?: string
  name?: string
  formattedName?: string
  groupType?: "USER_CONTACT_GROUP" | "SYSTEM_CONTACT_GROUP"
  memberCount?: number
  memberResourceNames?: string[]
}
```

| Operation      | Request                                                                                                            | Response                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Create         | `POST /contactGroups` — body `{ contactGroup: { name } }`                                                          | `ContactGroup`                                                                               |
| Get            | `GET /{resourceName}?groupFields=<mask>&maxMembers=<int>`                                                          | `ContactGroup` (`memberResourceNames` populated only if `maxMembers` was set)                |
| List           | `GET /contactGroups?groupFields=<mask>&pageSize=<int>&pageToken=<string>`                                          | `{ contactGroups?: ContactGroup[], nextPageToken?: string }`                                 |
| Rename         | `PUT /{resourceName}` — body `{ contactGroup: { etag, name }, updateGroupFields: "name" }`                         | `ContactGroup`                                                                               |
| Delete         | `DELETE /{resourceName}?deleteContacts=<bool>`                                                                     | empty on success                                                                             |
| Modify members | `POST /{resourceName}/members:modify` — body `{ resourceNamesToAdd?: string[], resourceNamesToRemove?: string[] }` | `{ notFoundResourceNames?: string[], canNotRemoveLastContactGroupResourceNames?: string[] }` |

Rename is a read-then-write like `updateContact`: `GET` with
`groupFields=metadata` for the current `etag`, then `PUT` the new name with
that `etag`.

### Other contacts

| Operation        | Request                                                                                                                          | Response                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| List             | `GET /otherContacts?readMask=<mask>&pageSize=<int>&pageToken=<string>`                                                           | `{ otherContacts?: Person[], nextPageToken?: string }` |
| Search           | `GET /otherContacts:search?query=<string>&readMask=<mask>&pageSize=<int>`                                                        | `{ results?: { person?: Person }[] }`                  |
| Copy to contacts | `POST /{resourceName}:copyOtherContactToMyContactsGroup` — `resourceName` is `otherContacts/<id>`; body `{ copyMask: <string> }` | `Person`                                               |

Other-contact resource names use the `otherContacts/<id>` form, distinct
from `people/<id>`. What field set other contacts actually carry, and which
fields `copyMask` may name, is vendor-specific — see
[Other contacts](google-contacts-api-gotchas.md#other-contacts).

## Error-handling pattern

Google returns errors as one JSON envelope regardless of endpoint:

```
{ error: { code: number, message: string, status: string } }
```

Structure your own error handling the same way this connector's scripts do:

1. Check the HTTP status. On non-2xx, read the response body (fall back to
   raw text if it isn't valid JSON — an empty or non-JSON body is possible).
2. Pull `error.status` (a canonical string like `UNAUTHENTICATED`,
   `RESOURCE_EXHAUSTED`, `PERMISSION_DENIED`, `FAILED_PRECONDITION`,
   `INVALID_ARGUMENT`, `NOT_FOUND`, `ALREADY_EXISTS`) and `error.message` out
   of it.
3. Branch recovery on `status` (falling back to the HTTP code if `status`
   is missing) — reconnect, back off, re-fetch-and-retry, or fix-the-request
   are all different recoveries depending on which one you hit. The mapping
   from status/code to what it means and how to recover is already written
   up — see [Error envelope](google-contacts-api-gotchas.md#error-envelope)
   and don't re-derive it; just branch on the same statuses it lists.
4. On success, the delete endpoints (`deleteContact`, `deleteContactGroup`)
   return an empty body — don't try to parse JSON out of them; treat a 2xx
   as success directly. Every other endpoint returns JSON — parse and use it.

## Critical rules

Everything below is a vendor-behavior fact, not this connector's own
mechanism — each line is a pointer into the gotchas doc rather than a
restatement, so follow the link for the exact wording and source:

- Update semantics for `updateContact` (whole-array replacement, untouched
  fields left alone) — [Update replacement semantics](google-contacts-api-gotchas.md#update-replacement-semantics-updatecontact).
- Etag concurrency requirement and what a stale etag produces —
  [Etag-based optimistic concurrency](google-contacts-api-gotchas.md#etag-based-optimistic-concurrency).
- Which `Person` fields are singleton (reject more than one value) —
  [Singleton fields](google-contacts-api-gotchas.md#singleton-fields).
- Search's prefix-matching semantics and the warmup requirement —
  [Search: prefix matching and warmup](google-contacts-api-gotchas.md#search-prefix-matching-and-warmup).
- Why a just-written contact might not show up in search/sync yet —
  [Write propagation delay](google-contacts-api-gotchas.md#write-propagation-delay).
- Sequencing requirement for concurrent writes on the same account —
  [Mutate request serialization](google-contacts-api-gotchas.md#mutate-request-serialization).
- Exact resource-name formats for contacts, groups, and other contacts —
  [Resource name formats](google-contacts-api-gotchas.md#resource-name-formats).
- `USER_CONTACT_GROUP` vs `SYSTEM_CONTACT_GROUP` semantics (what you can
  rename/delete) — [Contact groups: user vs system](google-contacts-api-gotchas.md#contact-groups-user-vs-system).
- Limits and partial-failure reporting on group-membership modification —
  [Contact group membership](google-contacts-api-gotchas.md#contact-group-membership).
- What "other contacts" are and their field/scope restrictions —
  [Other contacts](google-contacts-api-gotchas.md#other-contacts).
- Page-size ranges and defaults per endpoint —
  [Pagination](google-contacts-api-gotchas.md#pagination).
- The email-address cap on list-style endpoints and how to get the rest —
  [Email address cap on list endpoints](google-contacts-api-gotchas.md#email-address-cap-on-list-endpoints).
- Why every read needs an explicit field mask —
  [personFields is required on reads](google-contacts-api-gotchas.md#personfields-is-required-on-reads).
- Why delete calls return nothing to parse —
  [Delete responses are empty](google-contacts-api-gotchas.md#delete-responses-are-empty).

## Where to go next

- [Error envelope](google-contacts-api-gotchas.md#error-envelope)
- [Update replacement semantics (updateContact)](google-contacts-api-gotchas.md#update-replacement-semantics-updatecontact)
- [Etag-based optimistic concurrency](google-contacts-api-gotchas.md#etag-based-optimistic-concurrency)
- [Singleton fields](google-contacts-api-gotchas.md#singleton-fields)
- [Search: prefix matching and warmup](google-contacts-api-gotchas.md#search-prefix-matching-and-warmup)
- [Write propagation delay](google-contacts-api-gotchas.md#write-propagation-delay)
- [Mutate request serialization](google-contacts-api-gotchas.md#mutate-request-serialization)
- [Resource name formats](google-contacts-api-gotchas.md#resource-name-formats)
- [Contact groups: user vs system](google-contacts-api-gotchas.md#contact-groups-user-vs-system)
- [Contact group membership](google-contacts-api-gotchas.md#contact-group-membership)
- [Other contacts](google-contacts-api-gotchas.md#other-contacts)
- [Pagination](google-contacts-api-gotchas.md#pagination)
- [Email address cap on list endpoints](google-contacts-api-gotchas.md#email-address-cap-on-list-endpoints)
- [personFields is required on reads](google-contacts-api-gotchas.md#personfields-is-required-on-reads)
- [Delete responses are empty](google-contacts-api-gotchas.md#delete-responses-are-empty)
