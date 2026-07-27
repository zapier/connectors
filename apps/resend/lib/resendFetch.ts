// Shared Resend request wrapper. Every tool in the connector hits the same
// `https://api.resend.com` base over a single bearer credential, and Resend
// returns a uniform JSON error envelope (`{ name, message, statusCode }`) on
// non-2xx. Centralizing the base URL, the JSON `Content-Type`, and the
// error-name → actionable-hint mapping here keeps every script's run() body
// focused on their own request/response shape and maps each app-specific
// failure (restricted key, unverified domain, unknown id, rate limit) once
// instead of per script.

import { ConnectorHttpError, readResponseBody } from "@zapier/connectors-sdk";

/** Base URL for the Resend API. */
export const RESEND_API_BASE = "https://api.resend.com";

/** Resend's JSON error body shape (`{ name, message, statusCode }`). */
interface ResendErrorBody {
  name?: string;
  message?: string;
  statusCode?: number;
}

/**
 * Map a Resend error `name` to a one-line, recovery-oriented hint. Returns
 * `undefined` for names with no better guidance than the raw body already
 * carries (which `throwIfNotOk` surfaces on `error.response`). The upstream
 * status/body always ride along on `error.response`; the hint is only the
 * clean, actionable one-liner an agent reads first.
 */
function resendErrorHint(
  name: string | undefined,
  message: string | undefined,
): string | undefined {
  switch (name) {
    case "restricted_api_key":
      return "this API key can only send email; use a full-access key for contacts, segments, domains, and broadcasts.";
    case "missing_api_key":
    case "invalid_api_key":
      return "the API key is missing or invalid — reconnect with a valid re_… key from https://resend.com/api-keys.";
    case "validation_error":
      // `validation_error` is reused across several 4xx conditions; the
      // domain-not-verified 403 is the #1 send failure, so disambiguate on the
      // message rather than the name.
      return message && /domain|verif/i.test(message)
        ? "the sender domain isn't verified — verify it at https://resend.com/domains, or send from onboarding@resend.dev to your own account address for tests." // pii:allow -- Resend public sandbox address, not real PII
        : undefined;
    case "not_found":
      return "no resource matched that id — list the resource (listContacts / listSegments / listEmails / listDomains) to find a valid id.";
    case "rate_limit_exceeded":
      return "rate limit hit (default 10 requests/second/team) — back off and retry.";
    case "daily_quota_exceeded":
    case "monthly_quota_exceeded":
      return "the account's send quota is exhausted — not retriable until the quota resets or the plan is upgraded.";
    default:
      return undefined;
  }
}

/**
 * Make an authed Resend request. `fetch` is the connection-injected `ctx.fetch`
 * — the resolver chain has already attached `Authorization: Bearer re_…`. Adds
 * `Content-Type: application/json` for JSON bodies, and on non-2xx throws a
 * `ConnectorHttpError` whose message carries a Resend-specific recovery hint
 * when one applies (falling back to `throwIfNotOk`'s generic throw otherwise).
 * The full upstream Response (status, headers, body) is always on
 * `error.response`. Returns the raw Response so the caller can `.json()` it into
 * the tool's output shape.
 *
 * `label` names the call site (e.g. "Resend sendEmail") and is echoed in the
 * thrown error's message.
 */
export async function resendFetch(
  fetch: typeof globalThis.fetch,
  path: string,
  init: RequestInit = {},
  label = "Resend request",
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const url = path.startsWith("http") ? path : `${RESEND_API_BASE}${path}`;
  const res = await fetch(url, { ...init, headers });

  if (res.ok) return res;

  // Non-2xx: read the Resend error envelope once and build a ConnectorHttpError
  // that captures the full Response on `error.response`. When we recognize the
  // `name`, prepend an actionable recovery hint; otherwise fall back to a
  // call-site-labelled message (the raw body/status are still on the error).
  const body = await readResponseBody(res);
  const { name, message } = (body ?? {}) as ResendErrorBody;
  const hint = resendErrorHint(name, message);
  throw ConnectorHttpError.fromResponseBody(res, body, {
    message: hint
      ? `${label}: ${name} — ${hint}`
      : `${label} failed${name ? ` (${name})` : ""}`,
  });
}
