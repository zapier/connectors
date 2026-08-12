// Shared Harvest request helpers. Two things are identical across all 29 tools,
// so they live here rather than being re-derived per script:
//
//   - `harvestFetch` pins the constant request-shaping headers (`User-Agent`,
//     and `Content-Type: application/json` for bodies) and routes every non-2xx
//     response through `harvestError` so the status + parsed body reach the
//     agent as a `ConnectorHttpError`. The auth headers (Authorization +
//     Harvest-Account-Id) are attached upstream by the connection resolver, not
//     here.
//   - `harvestError` maps Harvest's HTTP status conventions to an actionable,
//     recoverable message (401 → reconnect, 429 → honor Retry-After, etc.).
//
// The response-*shaping* (which fields each tool pins) stays inline in each
// script for legibility — only the cross-cutting request wrapper + error
// mapping are lifted.

import { ConnectorHttpError, readResponseBody } from "@zapier/connectors-sdk";

/** Harvest requires a User-Agent on every request; pinned in one place. */
export const HARVEST_USER_AGENT =
  "Zapier Harvest Connector (support@zapier.com)";

/**
 * Build an actionable `ConnectorHttpError` from a non-2xx Harvest response.
 * Harvest uses conventional HTTP status codes and carries a human-readable
 * message in a JSON body (notably on 422 validation errors). This reads the
 * body for the summary and adds a recovery hint by status; the full response
 * (status, headers, body) rides on `error.response` and renders in
 * `toString()`, so a structured body and header-only signals like `Retry-After`
 * survive intact.
 */
export async function harvestError(
  toolName: string,
  res: Response,
): Promise<ConnectorHttpError> {
  const body = await readResponseBody(res);
  // Harvest 422s carry `{ "message": "..." }`; other errors may be plain text.
  let detail = "";
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string") detail = message;
  } else if (typeof body === "string") {
    detail = body.slice(0, 500);
  }

  let hint = "";
  switch (res.status) {
    case 401:
      hint = " — the token is invalid, expired, or revoked; reconnect Harvest.";
      break;
    case 403:
      hint = " — the connected account lacks permission for this resource.";
      break;
    case 404:
      hint = " — the resource was not found; check the id.";
      break;
    case 422:
      hint = " — the request was rejected as invalid; check the field values.";
      break;
    case 429: {
      const retryAfter = res.headers.get("retry-after");
      hint = retryAfter
        ? ` — rate limit reached (100 requests / 15s); retry after ${retryAfter}s.`
        : " — rate limit reached (100 requests / 15s); retry with backoff.";
      break;
    }
  }

  return ConnectorHttpError.fromResponseBody(res, body, {
    message: `Harvest ${toolName} ${res.status}: ${detail || res.statusText}${hint}`,
  });
}

/**
 * Make an authed Harvest request. `fetch` is the connection-injected `ctx.fetch`
 * (the resolver chain has already attached the Authorization + Harvest-Account-Id
 * headers). Adds the `User-Agent` (and `Content-Type: application/json` for
 * bodies), throws a `ConnectorHttpError` via `harvestError` on non-2xx, and
 * returns the raw `Response` so the caller can `.json()` it into the tool's
 * output shape.
 */
export async function harvestFetch(
  fetch: typeof globalThis.fetch,
  toolName: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("User-Agent")) headers.set("User-Agent", HARVEST_USER_AGENT);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) throw await harvestError(toolName, res);
  return res;
}
