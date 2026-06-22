#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  AddressInput,
  BiographyInput,
  BirthdayInput,
  ContactEventInput,
  DEFAULT_PERSON_FIELDS,
  EmailAddressInput,
  MembershipInput,
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
    names: z
      .array(NameInput)
      .describe(
        "Name parts. Set unstructuredName (the full formatted name) or it is derived from the parts.",
      )
      .optional(),
    emailAddresses: z
      .array(EmailAddressInput)
      .describe("Email addresses.")
      .optional(),
    phoneNumbers: z
      .array(PhoneNumberInput)
      .describe("Phone numbers.")
      .optional(),
    addresses: z.array(AddressInput).describe("Postal addresses.").optional(),
    organizations: z
      .array(OrganizationInput)
      .describe("Companies / job titles.")
      .optional(),
    biographies: z
      .array(BiographyInput)
      .describe("Notes about the contact.")
      .optional(),
    birthdays: z
      .array(BirthdayInput)
      .describe(
        "Birthdays. Use a structured date (year optional for year-less birthdays).",
      )
      .optional(),
    urls: z.array(UrlInput).describe("Websites or profile links.").optional(),
    events: z
      .array(ContactEventInput)
      .describe("Custom dates such as anniversaries.")
      .optional(),
    relations: z
      .array(RelationInput)
      .describe("Related people (e.g. spouse, manager).")
      .optional(),
    userDefined: z
      .array(UserDefinedInput)
      .describe("Custom key/value fields.")
      .optional(),
    memberships: z
      .array(MembershipInput)
      .describe(
        "Contact groups to add this new contact to at creation. For an EXISTING contact use modifyContactGroupMembers instead. Resolve ids via listContactGroups.",
      )
      .optional(),
    personFields: z
      .string()
      .describe(
        "Comma-separated list of contact fields to return (e.g. names,emailAddresses,phoneNumbers). Defaults to a comprehensive set; narrow it to reduce payload. Include metadata for the etag.",
      )
      .default(DEFAULT_PERSON_FIELDS),
  })
  .strict();

const definition = defineTool({
  name: "createContact",
  title: "Create Contact",
  description:
    "Create a new contact from structured name, email, phone, address, and organization fields. Provide at least a name or one contact method.",
  inputSchema,
  outputSchema: PersonSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-contacts",
  run: async (input, ctx) => {
    const { personFields, memberships, ...sections } = input;
    // Only attach sections that carry values — the API rejects empty optional
    // sections ([] / [{}]) with INVALID_ARGUMENT.
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(sections)) {
      if (value !== undefined) body[key] = value;
    }
    // memberships is agent-friendly ([{contactGroupResourceName}]); the wire shape
    // nests it under contactGroupMembership.
    if (memberships !== undefined) {
      body.memberships = memberships.map((m) => ({
        contactGroupMembership: {
          contactGroupResourceName: m.contactGroupResourceName,
        },
      }));
    }
    const url = new URL(
      "https://people.googleapis.com/v1/people:createContact",
    );
    url.searchParams.set("personFields", personFields);
    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwForGoogleContacts(res, "createContact");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
