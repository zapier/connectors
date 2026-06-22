// Shared output schemas for the Outlook resources that recur across tools —
// the canonical Recipient / DateTimeTimeZone / Message / Event / Contact /
// Attachment shapes. Lifted here so every tool that returns one agrees on its
// fields (required-vs-optional and type), instead of each script re-declaring a
// shape that drifts the moment one polish pass touches one and not the others.
// All are plain `z.object`s: unknown keys the Graph API adds are stripped on
// parse, so the agent sees only the canonical fields pinned here.

import { z } from "zod";

// — Small shared sub-shapes —

/** An email address with an optional display name. */
export const emailAddressSchema = z.object({
  address: z.string().describe("Email address, e.g. jane@contoso.com."),
  name: z.string().optional().describe("Display name, when known."),
});

/** A mail recipient/sender: `{ emailAddress: { address, name? } }`. */
export const recipientSchema = z.object({
  emailAddress: emailAddressSchema,
});

/** An Outlook date-time: a naive local timestamp plus its time zone. */
export const dateTimeTimeZoneSchema = z.object({
  dateTime: z
    .string()
    .describe("Local date-time without offset, e.g. 2026-07-01T15:30:00."),
  timeZone: z
    .string()
    .describe(
      "Time-zone name, e.g. Pacific Standard Time or America/Los_Angeles.",
    ),
});

/** A message body or event body: content plus its content type. */
export const itemBodySchema = z.object({
  contentType: z.enum(["text", "html"]).describe("Body content type."),
  content: z.string().describe("Body content, as text or HTML."),
});

/** A follow-up flag on a message. */
export const followupFlagSchema = z.object({
  flagStatus: z
    .enum(["notFlagged", "flagged", "complete"])
    .describe("Follow-up flag state."),
  startDateTime: dateTimeTimeZoneSchema.optional(),
  dueDateTime: dateTimeTimeZoneSchema.optional(),
});

/** An event location (only the display name is surfaced). */
export const locationSchema = z.object({
  displayName: z.string().optional().describe("Location name."),
});

/** An event attendee with their response status. */
export const attendeeSchema = z.object({
  emailAddress: emailAddressSchema,
  type: z
    .string()
    .optional()
    .describe("Attendee type: required, optional, or resource."),
  status: z
    .object({
      response: z
        .string()
        .optional()
        .describe(
          "Response: none, accepted, tentativelyAccepted, declined, organizer.",
        ),
      time: z.string().optional(),
    })
    .optional(),
});

// — Messages —

/** Compact message shape returned by listMessages (newest first). */
export const messageListItemSchema = z.object({
  id: z.string(),
  subject: z.string(),
  bodyPreview: z
    .string()
    .optional()
    .describe(
      "First ~255 chars of the body; use getMessage for the full body.",
    ),
  from: recipientSchema.optional(),
  receivedDateTime: z.string().optional(),
  isRead: z.boolean(),
  hasAttachments: z
    .boolean()
    .optional()
    .describe("False when a message has only inline attachments."),
  importance: z.string().optional(),
  webLink: z.string().optional(),
});

/** Full message shape returned by getMessage — the canonical Graph response. */
export const messageSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: itemBodySchema.optional(),
  bodyPreview: z.string().optional(),
  from: recipientSchema.optional(),
  sender: recipientSchema.optional(),
  toRecipients: z.array(recipientSchema).optional(),
  ccRecipients: z.array(recipientSchema).optional(),
  receivedDateTime: z.string().optional(),
  sentDateTime: z.string().optional(),
  isRead: z.boolean(),
  isDraft: z.boolean().optional(),
  hasAttachments: z.boolean().optional(),
  importance: z.string().optional(),
  categories: z.array(z.string()).optional(),
  flag: followupFlagSchema.optional(),
  parentFolderId: z.string().optional(),
  internetMessageId: z
    .string()
    .optional()
    .describe(
      "RFC 2822 id — stable across folder moves; use it to relocate a message.",
    ),
  conversationId: z.string().optional(),
  webLink: z.string().optional(),
});

// — Attachments —

const attachmentBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  contentType: z.string().optional(),
  size: z.number().optional().describe("Size in bytes."),
  type: z.string().describe('Attachment kind: "file", "item", or "reference".'),
});

/** Attachment summary returned by listAttachments. */
export const attachmentListItemSchema = attachmentBaseSchema.extend({
  isInline: z.boolean().optional(),
});

/** Single attachment returned by getAttachment, including bytes for files. */
export const attachmentSchema = attachmentBaseSchema.extend({
  contentBytes: z
    .string()
    .optional()
    .describe("Base64 content — present only for file attachments."),
});

// — Events —

/** Compact event shape returned by listEvents and listCalendarView. */
export const eventListItemSchema = z.object({
  id: z.string(),
  subject: z.string(),
  start: dateTimeTimeZoneSchema.optional(),
  end: dateTimeTimeZoneSchema.optional(),
  isAllDay: z.boolean().optional(),
  location: locationSchema.optional(),
  organizer: recipientSchema.optional(),
  type: z
    .string()
    .optional()
    .describe("singleInstance, seriesMaster, occurrence, or exception."),
  seriesMasterId: z
    .string()
    .optional()
    .describe(
      "For occurrences/exceptions: the id of the recurring series master.",
    ),
  webLink: z.string().optional(),
});

/** Full event shape returned by getEvent, createEvent, and updateEvent. */
export const eventSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: itemBodySchema.optional(),
  start: dateTimeTimeZoneSchema,
  end: dateTimeTimeZoneSchema,
  isAllDay: z.boolean().optional(),
  location: locationSchema.optional(),
  organizer: recipientSchema.optional(),
  attendees: z.array(attendeeSchema).optional(),
  isOnlineMeeting: z.boolean().optional(),
  onlineMeeting: z
    .object({ joinUrl: z.string().optional() })
    .optional()
    .describe("Online-meeting join details, when the event has one."),
  showAs: z
    .string()
    .optional()
    .describe("free, tentative, busy, oof, workingElsewhere, or unknown."),
  type: z.string().optional(),
  seriesMasterId: z.string().optional(),
  categories: z.array(z.string()).optional(),
  webLink: z.string().optional(),
});

// — Outgoing mail (input) —
//
// Input objects must reject unknown keys (the connectors-ref validator requires
// `z.strictObject` so a mistyped field fails loudly), so these input shapes are
// declared strict and separately from the (unknown-key-stripping) output
// recipient schemas above.

/** An email address as supplied on input. */
export const emailAddressInputSchema = z.strictObject({
  address: z.string().describe("Email address, e.g. jane@contoso.com."),
  name: z.string().describe("Display name, optional.").optional(),
});

/** A recipient as supplied on input: `{ emailAddress: { address, name? } }`. */
export const recipientInputSchema = z.strictObject({
  emailAddress: emailAddressInputSchema,
});

/** An Outlook date-time as supplied on input (naive local timestamp + zone). */
export const dateTimeTimeZoneInputSchema = z.strictObject({
  dateTime: z
    .string()
    .describe(
      "Naive local date-time, no trailing Z or offset, e.g. 2026-07-01T15:30:00. A Z/offset makes Graph ignore timeZone.",
    ),
  timeZone: z
    .string()
    .describe(
      "Time-zone name, e.g. Pacific Standard Time or America/Los_Angeles. Prefer an IANA name for correct DST.",
    ),
});

/** A file to attach inline, base64-encoded and under 3 MB. */
export const fileAttachmentInputSchema = z.strictObject({
  name: z.string().describe('File name shown in the email, e.g. "report.pdf".'),
  contentType: z
    .string()
    .describe('MIME type, e.g. "application/pdf".')
    .optional(),
  contentBytes: z
    .string()
    .describe(
      "Base64-encoded file bytes (no data: prefix). Decoded size must be under 3 MB.",
    ),
});

/**
 * The outgoing-email shape shared by sendMail and createDraft. Recipients are
 * objects ({ emailAddress: { address } }), not bare strings.
 */
export const outgoingMessageSchema = z.strictObject({
  subject: z.string().describe("Subject line."),
  body: z
    .strictObject({
      contentType: z
        .enum(["text", "html"])
        .describe("Body format. Defaults to text.")
        .optional(),
      content: z.string().describe("Body text or HTML."),
    })
    .describe("Message body.")
    .optional(),
  toRecipients: z
    .array(recipientInputSchema)
    .describe(
      'Primary recipients, e.g. [{ "emailAddress": { "address": "jane@contoso.com" } }].',
    ),
  ccRecipients: z
    .array(recipientInputSchema)
    .describe("Cc recipients.")
    .optional(),
  bccRecipients: z
    .array(recipientInputSchema)
    .describe("Bcc recipients.")
    .optional(),
  importance: z
    .enum(["low", "normal", "high"])
    .describe("Importance level. Defaults to normal.")
    .optional(),
  attachments: z
    .array(fileAttachmentInputSchema)
    .describe("Inline file attachments, each under 3 MB.")
    .optional(),
});

// — Outgoing event (input) —

/** An attendee as supplied on input. */
export const attendeeInputSchema = z.strictObject({
  emailAddress: emailAddressInputSchema,
  type: z
    .enum(["required", "optional", "resource"])
    .describe("Attendee type. Defaults to required.")
    .optional(),
});

/**
 * The outgoing-event shape for createEvent. updateEvent reuses it via
 * `.partial()` (every field optional for a patch). `attendees` replaces the
 * existing list — read current via getEvent, append, then update.
 */
export const outgoingEventSchema = z.strictObject({
  subject: z.string().describe("Event title."),
  start: dateTimeTimeZoneInputSchema.describe("Start date-time and time zone."),
  end: dateTimeTimeZoneInputSchema.describe("End date-time and time zone."),
  body: z
    .strictObject({
      contentType: z
        .enum(["text", "html"])
        .describe("Body format. Defaults to text.")
        .optional(),
      content: z.string().describe("Body text or HTML."),
    })
    .describe("Event body / description.")
    .optional(),
  isAllDay: z
    .boolean()
    .describe(
      "All-day event. Requires start/end at midnight with end the day AFTER the last day.",
    )
    .optional(),
  location: z
    .strictObject({ displayName: z.string().describe("Location name.") })
    .describe("Event location.")
    .optional(),
  attendees: z
    .array(attendeeInputSchema)
    .describe("Attendees. Replaces the existing list on updateEvent.")
    .optional(),
  isOnlineMeeting: z
    .boolean()
    .describe("Add a Teams online-meeting link (requires an M365 account).")
    .optional(),
  showAs: z
    .enum(["free", "tentative", "busy", "oof", "workingElsewhere", "unknown"])
    .describe("Free/busy status to show.")
    .optional(),
  sensitivity: z
    .enum(["normal", "personal", "private", "confidential"])
    .describe("Event sensitivity.")
    .optional(),
  reminderMinutesBeforeStart: z
    .number()
    .int()
    .describe("Minutes before start to remind.")
    .optional(),
  categories: z
    .array(z.string())
    .describe("Category names (see listCategories).")
    .optional(),
});

// — Outgoing contact (input) —

/**
 * The outgoing-contact shape shared by createContact and updateContact. No
 * single field is API-required; on updateContact the array fields
 * (emailAddresses, businessPhones) replace existing values.
 */
export const outgoingContactSchema = z.strictObject({
  givenName: z.string().describe("First name.").optional(),
  surname: z.string().describe("Last name.").optional(),
  displayName: z.string().describe("Full display name.").optional(),
  companyName: z.string().describe("Company name.").optional(),
  jobTitle: z.string().describe("Job title.").optional(),
  emailAddresses: z
    .array(emailAddressInputSchema)
    .max(3)
    .describe("Email addresses (Microsoft allows a maximum of 3).")
    .optional(),
  businessPhones: z
    .array(z.string())
    .describe("Business phone numbers.")
    .optional(),
  mobilePhone: z.string().describe("Mobile phone number.").optional(),
});

// — Contacts —

/** Personal contact shape returned by the contact tools. */
export const contactSchema = z.object({
  id: z.string(),
  displayName: z.string().optional(),
  givenName: z.string().optional(),
  surname: z.string().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  emailAddresses: z.array(emailAddressSchema).optional(),
  businessPhones: z.array(z.string()).optional(),
  mobilePhone: z.string().optional(),
});
