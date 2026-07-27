# Resend API gotchas

Behavioral notes for the Resend API that aren't obvious from the tool schemas. Every claim here is drawn from Resend's public documentation (links inline). Load this when a Resend call fails unexpectedly or when you need to know a limit, default, or enum before making a call.

## Base URL and auth

All requests go to `https://api.resend.com` with `Authorization: Bearer re_…` (your API key). See [API introduction](https://resend.com/docs/api-reference/introduction).

## API key permissions — sending vs full access

API keys have one of two permission levels ([create API key](https://resend.com/docs/api-reference/api-keys/create-api-key)):

- **`full_access`** — "Can create, delete, get, and update any resource."
- **`sending_access`** — "Can only send emails."

A `sending_access` key works for `sendEmail` but returns **`restricted_api_key` (401)** — "This API key is restricted to only send emails" — for contacts, segments, domains, and broadcasts. Reconnect with a full-access key to use those tools. ([errors](https://resend.com/docs/api-reference/errors))

## Sender domain must be verified

The `from` address must be on a domain you've verified in Resend. For testing you can send from `onboarding@resend.dev`, but **only to your own account email address** — otherwise you get **`validation_error` (403)**: "You can only send testing emails to your own email address." Use `listDomains` to see which of your domains are verified. ([errors](https://resend.com/docs/api-reference/errors))

## Rate limits and quotas

- **Rate limit:** "The default maximum rate limit is 10 requests per second per team. This limit applies across all API keys associated with your team." Exceeding it returns **`rate_limit_exceeded` (429)** — back off and retry. ([API introduction](https://resend.com/docs/api-reference/introduction))
- **Quotas:** **`daily_quota_exceeded`** / **`monthly_quota_exceeded`** (both 429) mean the account's send quota is exhausted. These are not retriable until the quota resets (or the plan is upgraded). ([errors](https://resend.com/docs/api-reference/errors))

## Error envelope

Non-2xx responses carry a JSON body of the form `{ name, message, statusCode }`. Match on `name` to decide recovery. Notable codes ([errors](https://resend.com/docs/api-reference/errors)):

| `name`                   | HTTP | Meaning                                                            |
| ------------------------ | ---- | ------------------------------------------------------------------ |
| `missing_api_key`        | 401  | Missing API key in the authorization header.                       |
| `restricted_api_key`     | 401  | This API key is restricted to only send emails.                    |
| `invalid_api_key`        | 403  | API key is invalid.                                                |
| `validation_error`       | 403  | You can only send testing emails to your own email address.        |
| `validation_error`       | 400  | An error was found with one or more fields in the request.         |
| `not_found`              | 404  | The requested endpoint does not exist.                             |
| `invalid_attachment`     | 422  | Attachment must have either a `content` or `path`.                 |
| `invalid_from_address`   | 422  | Invalid `from` field.                                              |
| `invalid_region`         | 422  | Region must be `us-east-1`, `eu-west-1`, or `sa-east-1`.           |
| `rate_limit_exceeded`    | 429  | Too many requests. Please limit the number of requests per second. |
| `daily_quota_exceeded`   | 429  | You have reached your daily email quota.                           |
| `monthly_quota_exceeded` | 429  | You have reached your monthly email quota.                         |

## Sending email (`sendEmail`)

- **Recipients:** `to` accepts an array of addresses, **max 50**. ([send email](https://resend.com/docs/api-reference/emails/send-email))
- **Body:** provide `html` and/or `text`. `text` is "auto-generated from HTML unless explicitly set to empty string." ([send email](https://resend.com/docs/api-reference/emails/send-email))
- **Scheduling:** `scheduled_at` accepts natural language (e.g. `in 1 min`) or ISO 8601 (e.g. `2026-08-05T11:52:01.858Z`); omit it to send now. ([send email](https://resend.com/docs/api-reference/emails/send-email))
- **Tags:** each tag name/value "can only contain ASCII letters (a-z, A-Z), numbers (0-9), underscores (\_), or dashes (-). It can contain no more than 256 characters." ([send email](https://resend.com/docs/api-reference/emails/send-email))
- **Attachments:** the API supports either a hosted `path` (a URL Resend fetches) or base64 `content`, up to **40MB per email after Base64 encoding**. This connector's `attachments` field exposes only the hosted-URL (`path`) form. Use `content_id` to embed an inline image — reference it in the HTML with `<img src="cid:…">`. ([send email](https://resend.com/docs/api-reference/emails/send-email))

## Delivery status (`getEmail` / `listEmails`)

`last_event` reports the email's current status. Documented values ([managing emails](https://resend.com/docs/dashboard/emails/introduction)):

`bounced`, `canceled`, `clicked`, `complained`, `delivered`, `delivery_delayed`, `failed`, `opened`, `queued`, `scheduled`, `sent`, `suppressed`.

Notable ones: `complained` = delivered but the recipient marked it as spam; `queued` = created from Broadcasts or Batches and queued for delivery; `suppressed` = not sent because the recipient is on the suppression list.

## Pagination (all `list*` tools)

List endpoints use cursor pagination ([list contacts](https://resend.com/docs/api-reference/contacts/list-contacts)):

- `limit` — **default 20, min 1, max 100** per the API. (Note: this connector's `listEmails` requests 10 when you omit `limit` — that is a connector-side default, not Resend's API default of 20.)
- `after` / `before` — the id after/before which to page. "You can only use either `after` or `before` parameter, not both."
- `has_more` in the response signals whether more pages exist.

## Contacts

- **Reference by id or email:** contact endpoints accept either a contact id or an email address in the path — "Either `id` or `email` must be provided." ([get contact](https://resend.com/docs/api-reference/contacts/get-contact))
- **Unsubscribe:** `unsubscribed` is "the Contact's global subscription status. If set to `true`, the contact will be unsubscribed from all Broadcasts." ([create contact](https://resend.com/docs/api-reference/contacts/create-contact))
- **Custom properties:** `properties` is a map of custom key/value pairs. Discover the valid keys with `listContactProperties` before setting them.

## Segments

A segment is a named grouping a contact can belong to; a contact can be in more than one. This connector manages membership explicitly through `addContactToSegment` / `removeContactFromSegment` and the `segments` field on contact create/update.

Membership is distinct from the contact's own lifecycle: `deleteSegment` removes the segment (the response reports `{ object: "segment", deleted: true }`), and `removeContactFromSegment` changes membership — neither is the same operation as `deleteContact`, which removes the contact itself.

## Domains

`listDomains` reports each sending domain's verification `status` ([domains overview](https://resend.com/docs/dashboard/domains/introduction)):

`not_started`, `pending`, `verified`, `partially_verified`, `partially_failed`, `failed`, `temporary_failure`.

A domain must reach `verified` before you can send from it in production. `region` is the AWS region the domain sends from — one of `us-east-1`, `eu-west-1`, or `sa-east-1` ([errors: invalid_region](https://resend.com/docs/api-reference/errors)).

## Broadcasts

`createBroadcast` produces a **draft** — "Send the broadcast immediately after creation. Defaults to `false`." Nothing is sent until you call `sendBroadcast`. The `name` field is "only used for internal reference" and is not shown to recipients. ([create broadcast](https://resend.com/docs/api-reference/broadcasts/create-broadcast))

As with any send, use a verified sending domain for the broadcast `from` address in production.

## Triggering automations (`sendEvent`)

`POST /events/send` fires a named event that triggers an automation. The `event` name must match the event configured on an automation's trigger step (`config: { eventName: … }`). Identify the contact by `contact_id` or by `email` (the docs show both as alternative forms). This connector's `sendEvent` tool requires **exactly one** of the two and rejects the call otherwise. ([automations](https://resend.com/docs/dashboard/automations/introduction))
