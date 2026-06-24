#!/usr/bin/env node
// updateContact is an etag read-modify-write — the People API rejects an update
// without the contact's current etag (400 FAILED_PRECONDITION), so run() first GETs
// the contact for the fresh etag, then PATCHes :updateContact. The updatePersonFields
// mask is derived from exactly the fields supplied so an untouched section is never
// cleared (the API replaces every named field array wholesale).
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  AddressInput,
  BiographyInput,
  BirthdayInput,
  ContactEventInput,
  DEFAULT_PERSON_FIELDS,
  deriveUpdatePersonFields,
  EmailAddressInput,
  NameInput,
  OrganizationInput,
  PersonSchema,
  PhoneNumberInput,
  RelationInput,
  throwForGoogleContacts,
  UrlInput,
  UserDefinedInput,
} from "../lib/google-contacts.ts";

const inputSchema = z
  .object({
    resourceName: z
      .string()
      .describe(
        "Contact to update, e.g. people/c12345 (from listContacts or searchContacts). Pass it whole, including the people/ prefix.",
      ),
    names: z
      .array(NameInput)
      .describe(
        "Replaces the full names array. unstructuredName is rebuilt from the parts if you omit it.",
      )
      .optional(),
    emailAddresses: z
      .array(EmailAddressInput)
      .describe(
        "Replaces the full email list. To add one without losing the others, getContact first, append, then send the complete array.",
      )
      .optional(),
    phoneNumbers: z
      .array(PhoneNumberInput)
      .describe(
        "Replaces the full phone list. To add one without losing the others, getContact first, append, then send the complete array.",
      )
      .optional(),
    addresses: z
      .array(AddressInput)
      .describe("Replaces the full addresses array.")
      .optional(),
    organizations: z
      .array(OrganizationInput)
      .describe("Replaces the full organizations array.")
      .optional(),
    biographies: z
      .array(BiographyInput)
      .describe("Replaces the full notes (biographies) array.")
      .optional(),
    birthdays: z
      .array(BirthdayInput)
      .describe("Replaces the full birthdays array.")
      .optional(),
    urls: z
      .array(UrlInput)
      .describe("Replaces the full urls array.")
      .optional(),
    events: z
      .array(ContactEventInput)
      .describe("Replaces the full custom-events array.")
      .optional(),
    relations: z
      .array(RelationInput)
      .describe("Replaces the full relations array.")
      .optional(),
    userDefined: z
      .array(UserDefinedInput)
      .describe("Replaces the full userDefined key/value array.")
      .optional(),
  })
  .strict();

/** Rebuild names[].unstructuredName from the parts when the agent set name parts
 * but not the full name, so the contact's display name doesn't go stale. */
function withUnstructuredNames(
  names: z.infer<typeof NameInput>[],
): z.infer<typeof NameInput>[] {
  return names.map((n) => {
    if (n.unstructuredName) return n;
    const parts = [
      n.honorificPrefix,
      n.givenName,
      n.middleName,
      n.familyName,
      n.honorificSuffix,
    ].filter((p): p is string => Boolean(p && p.trim()));
    if (parts.length === 0) return n;
    return { ...n, unstructuredName: parts.join(" ") };
  });
}

const definition = defineTool({
  name: "updateContact",
  title: "Update Contact",
  description:
    "Update fields on an existing contact. Each array you send REPLACES that whole field (e.g. sending emailAddresses replaces every email) — to add to a list, getContact first, append, then send the full array. Fields you omit are left untouched. Does not change group membership (use modifyContactGroupMembers).",
  inputSchema,
  outputSchema: PersonSchema,
  annotations: {
    readOnlyHint: false,
    // Each array field is replace-not-merge: sending one (e.g. emailAddresses)
    // overwrites the whole field and silently drops any values not included.
    // That is a non-additive (destructive) update, so the host should treat it
    // as such and not suppress a confirmation.
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-contacts",
  run: async (input, ctx) => {
    const { resourceName, ...fields } = input;
    const updatePersonFields = deriveUpdatePersonFields(fields);
    if (updatePersonFields === "") {
      throw new Error(
        "Google Contacts updateContact: no fields to update — supply at least one of names, emailAddresses, phoneNumbers, addresses, organizations, biographies, birthdays, urls, events, relations, or userDefined.",
      );
    }

    // resourceName (people/c…) is a Google resource path — the slash is significant
    // and must NOT be percent-encoded.
    // Step 1: read the current contact for its fresh etag (required by the API).
    const getUrl = new URL(`https://people.googleapis.com/v1/${resourceName}`);
    getUrl.searchParams.set("personFields", "metadata");
    const getRes = await ctx.fetch(getUrl.toString(), { method: "GET" });
    await throwForGoogleContacts(getRes, "updateContact");
    const current = (await getRes.json()) as { etag?: string };

    // Step 2: build the PATCH body — etag + only the supplied sections; rebuild
    // unstructuredName so the display name stays in sync with edited name parts.
    const body: Record<string, unknown> = { etag: current.etag, ...fields };
    if (fields.names) body.names = withUnstructuredNames(fields.names);

    const patchUrl = new URL(
      `https://people.googleapis.com/v1/${resourceName}:updateContact`,
    );
    patchUrl.searchParams.set("updatePersonFields", updatePersonFields);
    patchUrl.searchParams.set("personFields", DEFAULT_PERSON_FIELDS);
    const patchRes = await ctx.fetch(patchUrl.toString(), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwForGoogleContacts(patchRes, "updateContact");
    return patchRes.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
