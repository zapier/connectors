// Shared Runway request wrapper. The connector sends the `X-Runway-Version`
// header on every Runway API call — pinning it in one place makes a version
// bump a single edit, not 23. The wrapper also sets `Content-Type` for JSON bodies
// and routes non-2xx responses through the SDK's `throwIfNotOk`, which throws
// a `ConnectorHttpError` carrying the status + parsed error body for the
// agent/CLI to inspect — so each script's run() stays focused on its own
// request/response shape.

import { throwIfNotOk } from "@zapier/connectors-sdk";

/** Base URL for the Runway API (the `next`/preview surface the connector targets). */
export const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";

/**
 * The Runway API version this connector pins. Sent as `X-Runway-Version` on
 * every request; Runway supports an older version for ~4 months after a new
 * one ships, so bumping it is a deliberate, single-line change here.
 */
export const RUNWAY_API_VERSION = "2024-11-06";

/**
 * Make an authed Runway request. `fetch` is the connection-injected `ctx.fetch`
 * — the resolver chain has already attached the `Authorization: Bearer <key>`
 * header. Adds `X-Runway-Version` (+ `Content-Type` for bodies), throws a
 * `ConnectorHttpError` on non-2xx (via `throwIfNotOk`), and returns the raw
 * Response so the caller can `.json()` it into the tool's output shape.
 */
export async function runwayFetch(
  fetch: typeof globalThis.fetch,
  path: string,
  init: RequestInit = {},
  label?: string,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("X-Runway-Version", RUNWAY_API_VERSION);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const url = path.startsWith("http") ? path : `${RUNWAY_API_BASE}${path}`;
  const res = await fetch(url, { ...init, headers });
  await throwIfNotOk(res, label);
  return res;
}
