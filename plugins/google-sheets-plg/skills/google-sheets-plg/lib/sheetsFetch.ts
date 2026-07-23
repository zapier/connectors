// Shared request wrapper for the Google Sheets connector. Sets Content-Type for
// JSON bodies and maps Google's error envelope to an actionable ConnectorHttpError
// on non-2xx — so each script's run() stays focused on its own response shape.
//
// Google returns errors as { error: { code, message, status } }. The most common
// production failures (by far) are 429 rate-limiting and 400 INVALID_ARGUMENT on a
// bad A1 range; 403 splits into a scope problem (reconnect) vs a per-file permission
// problem. We surface each with a recovery hint.

import { ConnectorHttpError } from "@zapier/connectors-sdk";

interface GoogleError {
  error?: { code?: number; message?: string; status?: string };
}

function actionableMessage(status: number, body: GoogleError | null): string {
  const apiMsg = body?.error?.message ?? "";
  const apiStatus = body?.error?.status ?? "";
  switch (status) {
    case 429:
      return `Google Sheets 429 rate limit exceeded (60 read + 60 write requests/min/user; the per-project pool is shared across all Zapier users). Back off with exponential delay and retry. ${apiMsg}`;
    case 400:
      // INVALID_ARGUMENT is overwhelmingly a bad/unquoted A1 range or a malformed request.
      return `Google Sheets 400 ${apiStatus || "INVALID_ARGUMENT"}: ${apiMsg || "bad request"}. If this is a range, qualify and single-quote the sheet name (e.g. 'My Sheet'!A1:C10) and confirm the worksheet exists.`;
    case 403:
      if (/insufficient|scope|ACCESS_TOKEN_SCOPE/i.test(apiMsg + apiStatus)) {
        return `Google Sheets 403 insufficient scope: ${apiMsg}. Reconnect Google Sheets granting Sheets (and Drive, for listSpreadsheets) access.`;
      }
      return `Google Sheets 403 permission denied: ${apiMsg || "you do not have access to this spreadsheet"}. The connected account must have edit access to this file.`;
    case 404:
      return `Google Sheets 404 not found: ${apiMsg || "spreadsheet or range not found"}. Verify the spreadsheet id (or URL) and worksheet title.`;
    default:
      return `Google Sheets ${status}${apiStatus ? ` ${apiStatus}` : ""}: ${apiMsg || "request failed"}.`;
  }
}

/**
 * Make an authed Google Sheets / Drive request. `fetch` is the connection-injected
 * `ctx.fetch`; the resolver chain has already attached the OAuth bearer token. Adds
 * `Content-Type: application/json` for request bodies, maps a non-2xx response to an
 * actionable `ConnectorHttpError`, and returns the raw Response for the caller to
 * `.json()` into the tool's output shape.
 */
export async function googleSheetsFetch(
  fetch: typeof globalThis.fetch,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as GoogleError | null;
    throw ConnectorHttpError.fromResponseBody(res, body, {
      message: actionableMessage(res.status, body),
    });
  }
  return res;
}
