# Google Contacts (People API) — API gotchas

Agent-facing reference for non-obvious Google People API behaviors.
Every claim below is sourced from public Google documentation.

## Error envelope

The People API returns errors as `{ error: { code, message, status } }` where
`status` is a [canonical Google status string](https://developers.google.com/people/api/rest/v1/people/updateContact).
Key mappings an agent should recognize:

| HTTP | status string         | Meaning / recovery                                                                                                                                                                                                                                                                                                                                   |
| ---- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 401  | `UNAUTHENTICATED`     | Credentials expired or revoked — reconnect.                                                                                                                                                                                                                                                                                                          |
| 429  | `RESOURCE_EXHAUSTED`  | Quota or rate limit hit. The People API tracks per-operation quota costs: a single create or update costs 1 critical read + 1 critical write + 1 daily contact write; batch operations cost more ([quota table](https://developers.google.com/people/v1/contacts)). Back off with exponential jitter.                                                |
| 403  | `PERMISSION_DENIED`   | OAuth scope too narrow — reconnect. Writes require the `contacts` scope; other-contacts reads require `contacts.other.readonly` ([otherContacts.list](https://developers.google.com/people/api/rest/v1/otherContacts/list)).                                                                                                                         |
| 400  | `FAILED_PRECONDITION` | Stale etag — "The server returns a 400 error with reason `failedPrecondition` if `person.metadata.sources.etag` is different than the contact's etag, which indicates the contact has changed since its data was read" ([updateContact](https://developers.google.com/people/api/rest/v1/people/updateContact)). Re-fetch with getContact and retry. |
| 400  | `INVALID_ARGUMENT`    | Malformed request. Common cause: sending more than one value on a singleton field — "The server returns a 400 error if more than one field is specified on a field that is a singleton for contact sources: biographies, birthdays, genders, names" ([updateContact](https://developers.google.com/people/api/rest/v1/people/updateContact)).        |
| 404  | `NOT_FOUND`           | Resource does not exist. Verify the `resourceName`.                                                                                                                                                                                                                                                                                                  |
| 409  | `ALREADY_EXISTS`      | Duplicate contact group name — "Attempting to create a group with a duplicate name will return a HTTP 409 error" ([contactGroups.create](https://developers.google.com/people/api/rest/v1/contactGroups/create)).                                                                                                                                    |

## Update replacement semantics (updateContact)

"All fields specified in the `updateMask` will be replaced"
([updateContact](https://developers.google.com/people/api/rest/v1/people/updateContact)).
Each array you name (e.g. `emailAddresses`, `phoneNumbers`) is **replaced wholesale** —
to add an entry without losing the others, read the contact first, append, then send
the complete array. Fields you omit from the mask are left untouched.
"Any non-contact data will not be modified. Any non-contact data in the person to
update will be ignored"
([updateContact](https://developers.google.com/people/api/rest/v1/people/updateContact)).

## Etag-based optimistic concurrency

The People API requires `person.metadata.sources.etag` for updates:
"you must include the `person.metadata.sources.etag` field in the person for the
contact to be updated"
([Read and Manage Contacts](https://developers.google.com/people/v1/contacts)).
A stale etag produces a 400 / `FAILED_PRECONDITION` — re-fetch and retry.

## Singleton fields

Some Person fields accept only a single value per contact source:
biographies, birthdays, genders, names. Sending an array with more than one entry
on these fields returns a 400
([updateContact](https://developers.google.com/people/api/rest/v1/people/updateContact)).

## Search: prefix matching and warmup

`searchContacts` and `searchOtherContacts` use **prefix phrase matching**:
"a person with name 'foo name' matches queries such as 'f', 'fo', 'foo', 'foo n',
'nam', etc., but not 'oo n'"
([searchContacts](https://developers.google.com/people/api/rest/v1/people/searchContacts)).

**Warmup required:** "Before searching, clients should send a warmup request with an
empty query to update the cache"
([searchContacts](https://developers.google.com/people/api/rest/v1/people/searchContacts)).
Without the warmup the cache may not reflect recent changes.

**Page size capped at 30:** "Values greater than 30 will be capped to 30"
([searchContacts](https://developers.google.com/people/api/rest/v1/people/searchContacts)).
Default is 10.

## Write propagation delay

"Writes may have a propagation delay of several minutes for sync requests.
Incremental syncs are not intended for read-after-write use cases"
([people.connections.list](https://developers.google.com/people/api/rest/v1/people.connections/list)).
Use `listContacts` (people.connections.list) when freshness matters — it is not
subject to the search-index propagation delay.

## Mutate request serialization

"Mutate requests for the same user should be sent sequentially to avoid increased
latency and failures"
([Read and Manage Contacts](https://developers.google.com/people/v1/contacts)).
Do not fire concurrent writes for the same account.

## Resource name formats

- Contacts: `people/{person_id}` — "An ASCII string in the form of `people/{person_id}`"
  ([people resource](https://developers.google.com/people/api/rest/v1/people)).
- Contact groups: `contactGroups/{contactGroupId}` — "An ASCII string, in the form
  of `contactGroups/{contactGroupId}`"
  ([contactGroups resource](https://developers.google.com/people/api/rest/v1/contactGroups)).
- Other contacts: `otherContacts/{person_id}` — the endpoint is
  `GET https://people.googleapis.com/v1/otherContacts`
  ([otherContacts.list](https://developers.google.com/people/api/rest/v1/otherContacts/list)).
- The resource name may change: "The resource name may change when adding or removing
  fields that link a contact and profile"
  ([people resource](https://developers.google.com/people/api/rest/v1/people)).

## Contact groups: user vs system

`groupType` distinguishes `USER_CONTACT_GROUP` (user-defined) from
`SYSTEM_CONTACT_GROUP` (system-defined, e.g. `myContacts`, `starred`)
([contactGroups resource](https://developers.google.com/people/api/rest/v1/contactGroups)).
System group names are "a system provided name" that is "translated and formatted in
the viewer's account locale"
([contactGroups resource](https://developers.google.com/people/api/rest/v1/contactGroups)).
The `contactGroups.create`, `update`, and `delete` methods operate on groups "owned
by the authenticated user"
([contactGroups.delete](https://developers.google.com/people/api/rest/v1/contactGroups/delete)).
System groups have system-provided names and localized `formattedName` values; the
`name` field description distinguishes "the group owner" from "a system provided name
for system groups"
([contactGroups](https://developers.google.com/people/api/rest/v1/contactGroups)).

Group names must be unique: "Created contact group names must be unique to the users
contact groups" ([contactGroups.create](https://developers.google.com/people/api/rest/v1/contactGroups/create)).

## Contact group membership

`modifyContactGroupMembers` enforces a combined limit: "The total number of resource
names in `resourceNamesToAdd` and `resourceNamesToRemove` must be less than or equal
to 1000"
([contactGroups.members.modify](https://developers.google.com/people/api/rest/v1/contactGroups.members/modify)).

The response reports partial failures without erroring:

- `notFoundResourceNames` — "The contact people resource names that were not found."
- `canNotRemoveLastContactGroupResourceNames` — "The contact people resource names
  that cannot be removed from their last contact group"
  ([contactGroups.members.modify](https://developers.google.com/people/api/rest/v1/contactGroups.members/modify)).

## Other contacts

"Other contacts" are "typically auto created contacts from interactions" that are
"not in a contact group"
([otherContacts.list](https://developers.google.com/people/api/rest/v1/otherContacts/list)).
They require the `contacts.other.readonly` OAuth scope
([otherContacts.list](https://developers.google.com/people/api/rest/v1/otherContacts/list))
and the connector exposes them only through read/copy tools: `listOtherContacts`, `searchOtherContacts`, and `copyOtherContact`.

**Limited field set:** other contacts support only a subset of person fields for
`READ_SOURCE_TYPE_CONTACT`: emailAddresses, metadata, names, phoneNumbers, photos
([otherContacts.list](https://developers.google.com/people/api/rest/v1/otherContacts/list)).

The `copyOtherContact` tool promotes an other contact to a saved contact (wrapping
Google's `otherContacts.copyOtherContactToMyContactsGroup` method). The `copyMask`
is limited to: emailAddresses, names, phoneNumbers
([docs](https://developers.google.com/people/api/rest/v1/otherContacts/copyOtherContactToMyContactsGroup)).

## Pagination

`listContacts` (people.connections.list): pageSize 1–1000, default 100.
`listContactGroups`: pageSize 1–1000, default 30.
`otherContacts.list`: pageSize 1–1000, default 100.
Search endpoints: pageSize capped at 30, default 10.
([people.connections.list](https://developers.google.com/people/api/rest/v1/people.connections/list),
[contactGroups.list](https://developers.google.com/people/api/rest/v1/contactGroups/list),
[otherContacts.list](https://developers.google.com/people/api/rest/v1/otherContacts/list),
[searchContacts](https://developers.google.com/people/api/rest/v1/people/searchContacts))

## Email address cap on list endpoints

"For `people.connections.list` and `otherContacts.list` the number of email addresses
is limited to 100. If a Person has more email addresses the entire set can be obtained
by calling `people.getBatchGet`"
([people resource](https://developers.google.com/people/api/rest/v1/people)).

## personFields is required on reads

"The request returns a 400 error if 'personFields' is not specified"
([people.get](https://developers.google.com/people/api/rest/v1/people/get)).
Every read operation requires an explicit field mask.

## Delete responses are empty

Both `deleteContact` and `deleteContactGroup` return an empty body on success
([deleteContact](https://developers.google.com/people/api/rest/v1/people/deleteContact),
[contactGroups.delete](https://developers.google.com/people/api/rest/v1/contactGroups/delete)).

## Sync token expiry

"Sync tokens expire 7 days after the full sync"
([people.connections.list](https://developers.google.com/people/api/rest/v1/people.connections/list)).
"A request with an expired sync token will get an error with an google.rpc.ErrorInfo
with reason `EXPIRED_SYNC_TOKEN`"
([people.connections.list](https://developers.google.com/people/api/rest/v1/people.connections/list)) —
perform a full sync without a `syncToken` to recover.
