// Shared Google Contacts (People API) schemas and error mapping.
//
// The Person resource is returned by ~10 tools (createContact, getContact,
// updateContact, searchContacts, listContacts, updateContactPhoto,
// deleteContactPhoto, copyOtherContactToMyContactsGroup, listOtherContacts,
// searchOtherContacts), and the Name / EmailAddress / PhoneNumber / Address /
// Organization / ... sub-shapes are shared between the contact-write inputs and
// the Person output — so the canonical shapes live here and every contact tool
// imports them. The error mapper is shared by all tools: Google returns the same
// `{ error: { code, message, status } }` body across the whole API, and the
// `status` string is what tells an agent whether to reconnect, wait, re-fetch a
// fresh etag, or fix its request.

import { ConnectorHttpError } from "@zapier/connectors-sdk";
import { z } from "zod";

// Field literals are shared between the strip-on-parse OUTPUT schemas (used in
// PersonSchema — unknown API fields are dropped, never thrown) and the strict
// INPUT schemas (used by createContact / updateContact — a mistyped field fails
// loudly instead of being silently dropped). The connectors-dev validator
// requires input objects to be strict at every level and output objects to strip.

// ---- Default field masks (the API requires a mask on every read/write) -------
// Every contact tool imports these defaults so all tools request the same fields.

/** Comprehensive personFields/readMask default — a useful contact without the
 * agent composing a mask. `metadata` is required for the etag to come back. */
export const DEFAULT_PERSON_FIELDS =
  "names,emailAddresses,phoneNumbers,addresses,organizations,biographies,birthdays,urls,events,relations,memberships,nicknames,occupations,photos,metadata,userDefined";

/** Default groupFields for contact-group reads. */
export const DEFAULT_GROUP_FIELDS =
  "name,groupType,memberCount,clientData,metadata";

/** The Person sections updateContact can write, in updatePersonFields order.
 * `memberships` is intentionally excluded — group membership goes through
 * modifyContactGroupMembers so updateContact can't wipe other groups. */
export const UPDATABLE_PERSON_FIELDS = [
  "names",
  "emailAddresses",
  "phoneNumbers",
  "addresses",
  "organizations",
  "biographies",
  "birthdays",
  "urls",
  "events",
  "relations",
  "userDefined",
] as const;

/**
 * Derive the updatePersonFields mask from exactly the fields the agent supplied,
 * so updateContact never names — and therefore never clears — a section the
 * agent didn't touch (the People API replaces every named field wholesale).
 */
export function deriveUpdatePersonFields(
  input: Record<string, unknown>,
): string {
  return UPDATABLE_PERSON_FIELDS.filter((f) => input[f] !== undefined).join(
    ",",
  );
}

// ---- Shared Person sub-shapes (dual input/output) ----------------------------

const nameFields = {
  givenName: z.string().describe("First name.").optional(),
  familyName: z.string().describe("Last name.").optional(),
  middleName: z.string().describe("Middle name.").optional(),
  honorificPrefix: z
    .string()
    .describe("Title prefix, e.g. Dr., Ms.")
    .optional(),
  honorificSuffix: z.string().describe("Suffix, e.g. Jr., PhD.").optional(),
  unstructuredName: z
    .string()
    .describe(
      "The full formatted name. Drives the display name — set it when changing name parts or the display name goes stale.",
    )
    .optional(),
};
export const NameSchema = z.object({
  ...nameFields,
  // Read-only computed names the API returns (output only — kept off NameInput).
  displayName: z
    .string()
    .describe("Read-only. The API's computed display name for the contact.")
    .optional(),
  displayNameLastFirst: z
    .string()
    .describe("Read-only. The computed display name in last-name-first order.")
    .optional(),
});
export const NameInput = z.strictObject(nameFields);

const emailFields = {
  value: z.string().describe("The email address."),
  type: z
    .string()
    .describe("Free-text label, e.g. home, work, other, or a custom label.")
    .optional(),
};
export const EmailAddressSchema = z.object(emailFields);
export const EmailAddressInput = z.strictObject(emailFields);

const phoneFields = {
  value: z
    .string()
    .describe("The phone number, in any format the user has it."),
  type: z
    .string()
    .describe("Free-text label, e.g. mobile, home, work, or a custom label.")
    .optional(),
};
export const PhoneNumberSchema = z.object(phoneFields);
export const PhoneNumberInput = z.strictObject(phoneFields);

const addressFields = {
  streetAddress: z.string().describe("Street and number.").optional(),
  extendedAddress: z
    .string()
    .describe("Apartment, suite, unit, etc.")
    .optional(),
  city: z.string().describe("City / locality.").optional(),
  region: z.string().describe("State / province / region.").optional(),
  postalCode: z.string().describe("Postal or ZIP code.").optional(),
  country: z.string().describe("Country name.").optional(),
  countryCode: z
    .string()
    .describe("ISO 3166-1 alpha-2 country code, e.g. US.")
    .optional(),
  poBox: z.string().describe("PO box.").optional(),
  type: z.string().describe("Free-text label, e.g. home, work.").optional(),
};
export const AddressSchema = z.object(addressFields);
export const AddressInput = z.strictObject(addressFields);

const organizationFields = {
  name: z.string().describe("Company / organization name.").optional(),
  title: z.string().describe("Job title.").optional(),
  department: z.string().describe("Department.").optional(),
  type: z.string().describe("Free-text label, e.g. work, school.").optional(),
};
export const OrganizationSchema = z.object(organizationFields);
export const OrganizationInput = z.strictObject(organizationFields);

const biographyFields = {
  value: z.string().describe("The note text."),
  contentType: z
    .enum(["TEXT_PLAIN", "TEXT_HTML"])
    .describe("Whether the value is plain text or HTML.")
    .optional(),
};
export const BiographySchema = z.object(biographyFields);
export const BiographyInput = z.strictObject(biographyFields);

const dateFields = {
  year: z
    .number()
    .int()
    .describe("Four-digit year. Omit if unknown.")
    .optional(),
  month: z.number().int().describe("Month, 1-12.").optional(),
  day: z.number().int().describe("Day of month, 1-31.").optional(),
};
const dateDescription =
  "A calendar date. Omit year for year-less dates (e.g. a birthday with no year).";
export const DateSchema = z.object(dateFields).describe(dateDescription);
export const DateInput = z.strictObject(dateFields).describe(dateDescription);

const birthdayFields = {
  date: DateSchema.optional(),
  text: z
    .string()
    .describe("Free-text birthday when a structured date is not available.")
    .optional(),
};
export const BirthdaySchema = z.object(birthdayFields);
export const BirthdayInput = z.strictObject({
  date: DateInput.optional(),
  text: birthdayFields.text,
});

const calendarEventFields = {
  date: DateSchema.optional(),
  type: z
    .string()
    .describe("Free-text label, e.g. anniversary, or a custom label.")
    .optional(),
};
export const ContactEventSchema = z.object(calendarEventFields);
export const ContactEventInput = z.strictObject({
  date: DateInput.optional(),
  type: calendarEventFields.type,
});

const relationFields = {
  person: z
    .string()
    .describe("The related person's name, free text, e.g. Jane Doe."),
  type: z
    .string()
    .describe("Relationship label, e.g. spouse, child, manager.")
    .optional(),
};
export const RelationSchema = z.object(relationFields);
export const RelationInput = z.strictObject(relationFields);

const userDefinedFields = {
  key: z.string().describe("The custom field's name."),
  value: z.string().describe("The custom field's value."),
};
export const UserDefinedSchema = z.object(userDefinedFields);
export const UserDefinedInput = z.strictObject(userDefinedFields);

const urlFields = {
  value: z.string().describe("The value, e.g. a URL."),
  type: z.string().describe("Free-text label.").optional(),
};
export const UrlSchema = z.object(urlFields);
export const UrlInput = z.strictObject(urlFields);

/** Group membership for contact INPUT (createContact only). */
export const MembershipInput = z.strictObject({
  contactGroupResourceName: z
    .string()
    .describe(
      "A contact group resource name (contactGroups/…) from listContactGroups.",
    ),
});

// ---- Output-only Person sub-shapes -------------------------------------------

const PhotoSchema = z.object({
  url: z.string().optional(),
  default: z.boolean().optional(),
});

const MembershipSchema = z.object({
  contactGroupMembership: z
    .object({ contactGroupResourceName: z.string().optional() })
    .optional(),
});

// ---- The canonical Person resource (output) ----------------------------------

/** The Google People API Person resource returned by every contact tool.
 * Mirrors the API's nested shape — no flattening or derived fields. */
export const PersonSchema = z
  .object({
    resourceName: z
      .string()
      .describe(
        "Canonical contact id, e.g. people/c12345. Pass to getContact/updateContact/deleteContact/modifyContactGroupMembers.",
      ),
    etag: z
      .string()
      .describe(
        "Optimistic-concurrency token. Used internally by updateContact; changes after every edit.",
      )
      .optional(),
    names: z.array(NameSchema).optional(),
    emailAddresses: z.array(EmailAddressSchema).optional(),
    phoneNumbers: z.array(PhoneNumberSchema).optional(),
    addresses: z.array(AddressSchema).optional(),
    organizations: z.array(OrganizationSchema).optional(),
    biographies: z.array(BiographySchema).optional(),
    birthdays: z.array(BirthdaySchema).optional(),
    urls: z.array(UrlSchema).optional(),
    events: z.array(ContactEventSchema).optional(),
    relations: z.array(RelationSchema).optional(),
    userDefined: z.array(UserDefinedSchema).optional(),
    nicknames: z.array(z.object({ value: z.string().optional() })).optional(),
    occupations: z.array(z.object({ value: z.string().optional() })).optional(),
    memberships: z.array(MembershipSchema).optional(),
    photos: z.array(PhotoSchema).optional(),
  })
  .describe(
    "A contact. Canonical People API Person resource — no flattening or derived fields.",
  );

/** Photo-mutation response — the updated contact under a `person` key. */
export const PersonResponseSchema = z.object({
  person: PersonSchema.optional(),
});

// ---- ContactGroup resource ---------------------------------------------------

/** The Google People API ContactGroup resource (a label). */
export const ContactGroupSchema = z
  .object({
    resourceName: z
      .string()
      .describe(
        "Canonical group id, e.g. contactGroups/1a2b3c. Pass to modifyContactGroupMembers.",
      ),
    etag: z
      .string()
      .describe(
        "Optimistic-concurrency token. Used internally by updateContactGroup.",
      )
      .optional(),
    name: z.string().describe("The group (label) name.").optional(),
    formattedName: z
      .string()
      .describe("Display name (localized for system groups).")
      .optional(),
    groupType: z
      .enum(["USER_CONTACT_GROUP", "SYSTEM_CONTACT_GROUP"])
      .describe(
        "USER_CONTACT_GROUP (editable) or SYSTEM_CONTACT_GROUP (e.g. myContacts, starred — not renamable/deletable).",
      )
      .optional(),
    memberCount: z
      .number()
      .int()
      .describe("Number of contacts in the group.")
      .optional(),
    memberResourceNames: z
      .array(z.string())
      .describe(
        "Member contact resource names (when requested via maxMembers).",
      )
      .optional(),
  })
  .describe("A contact group (label).");

// ---- Error mapping -----------------------------------------------------------

const RATE_LIMIT_STATUSES = new Set(["RESOURCE_EXHAUSTED"]);

interface GoogleErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

async function readBody(res: Response): Promise<unknown> {
  let text: string;
  try {
    text = await res.text();
  } catch {
    return undefined;
  }
  if (text === "") return "";
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Throw a ConnectorHttpError with an agent-actionable message on a non-OK
 * Google People API response, mapping Google's canonical `status` strings to the
 * recovery the agent should take (reconnect vs back-off vs re-fetch etag vs fix
 * the request). On success the response is returned unchanged so the caller can
 * read the body. Pass the tool name so the message names the failing operation.
 */
export async function throwForGoogleContacts(
  res: Response,
  toolName: string,
): Promise<Response> {
  if (res.ok) return res;
  const body = await readBody(res);
  const err = (body as GoogleErrorBody | undefined)?.error;
  const status = err?.status;
  const apiMessage = err?.message;
  const prefix = `Google Contacts ${toolName} ${res.status}`;

  let message: string;
  if (res.status === 401 || status === "UNAUTHENTICATED") {
    message = `${prefix}: invalid or expired credentials. Reconnect Google Contacts.`;
  } else if (
    res.status === 429 ||
    (status && RATE_LIMIT_STATUSES.has(status))
  ) {
    message = `${prefix}: RESOURCE_EXHAUSTED — rate/quota limited (the per-day Contact Writes quota is the common cause for writes). Back off and retry with jitter (no Retry-After is sent).`;
  } else if (res.status === 403) {
    message = `${prefix}: ${status ?? "PERMISSION_DENIED"} — the granted OAuth scope is too narrow. Reconnect Google Contacts with contacts access (and contacts.other.readonly for other-contacts tools).`;
  } else if (res.status === 400 && status === "FAILED_PRECONDITION") {
    message = `${prefix}: FAILED_PRECONDITION — the contact changed since it was read (stale etag). Re-fetch with getContact and retry.`;
  } else if (res.status === 400) {
    message = `${prefix}: ${status ?? "INVALID_ARGUMENT"} — ${apiMessage ?? "invalid request"}. Check the field mask and that no optional section was sent empty ([] or [{}]).`;
  } else if (res.status === 404 || status === "NOT_FOUND") {
    message = `${prefix}: NOT_FOUND — ${apiMessage ?? "the contact or group does not exist"}. Verify the resourceName (resolve contacts via listContacts/searchContacts, groups via listContactGroups).`;
  } else if (res.status === 409 || status === "ALREADY_EXISTS") {
    message = `${prefix}: ALREADY_EXISTS — ${apiMessage ?? "a resource with that name already exists"}.`;
  } else {
    message = `${prefix}: ${apiMessage ?? status ?? "request failed"}`;
  }

  throw ConnectorHttpError.fromResponseBody(res, body, { message });
}
