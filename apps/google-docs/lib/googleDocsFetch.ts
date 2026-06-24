// Shared request wrapper for the Google Docs + Drive APIs.
//
// `ctx.fetch` arrives already authed (the resolver chain attached the OAuth
// bearer). This wrapper sets `Content-Type` for JSON bodies, then on a non-2xx
// response parses Google's error envelope and throws an Error with an
// app-specific, actionable message — so each script's run() stays focused on
// its own success-response shape. Google's two distinct 403s (insufficient
// scope vs. view-only access) and the image / export-size errors all get
// routed to recovery hints here rather than leaking the raw status to the agent.

interface GoogleErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: { message?: string; reason?: string }[];
  };
}

/**
 * Map a Google API failure to an actionable, agent-facing message. `opName` is
 * the connector tool (e.g. "insertImage") so the agent sees which call failed.
 */
function mapGoogleError(
  opName: string,
  status: number,
  body: GoogleErrorBody | null,
  rawText: string,
): string {
  const apiMessage =
    body?.error?.message ?? rawText.slice(0, 300) ?? "unknown error";
  const reason = body?.error?.errors?.[0]?.reason ?? "";
  const lower = apiMessage.toLowerCase();

  if (status === 403 && lower.includes("insufficient authentication scopes")) {
    return `Google Docs ${opName}: the connection is missing edit scope. Reconnect Google Docs granting documents + drive access, then retry.`;
  }
  if (status === 403 && lower.includes("caller does not have permission")) {
    return `Google Docs ${opName}: you have view-only (or commenter) access to this document — editing requires writer access. Ask the owner to share it with edit permission. This is a sharing problem, not a reconnect.`;
  }
  if (
    reason === "exportSizeLimitExceeded" ||
    lower.includes("exportsizelimitexceeded")
  ) {
    return `Google Docs ${opName}: the document is too large to export (Drive caps export at 10MB). Read it in sections with getDocument's startIndex/endIndex range instead.`;
  }
  if (lower.includes("access to the provided image was forbidden")) {
    return `Google Docs ${opName}: the image URL is not publicly fetchable. Google fetches the image server-side, so it must be a public URL that needs no login or cookies — a standard Google Drive sharing link requires authentication and won't work.`;
  }
  if (lower.includes("problem retrieving the image")) {
    return `Google Docs ${opName}: Google could not retrieve the image. It must be PNG, JPEG, or GIF, under 50MB, and at most 25 megapixels.`;
  }
  if (status === 404) {
    return `Google Docs ${opName} 404: document not found. Check the documentId (the token in the doc URL /document/d/<id>/edit) — resolve a title to an id with findDocuments.`;
  }
  if (status === 429 || body?.error?.status === "RESOURCE_EXHAUSTED") {
    return `Google Docs ${opName} 429: rate limit exceeded (write quota is 60 batchUpdate calls/min/user). Back off and retry.`;
  }
  return `Google Docs ${opName} ${status}: ${apiMessage}`;
}

/**
 * Make a Google Docs / Drive request. `fetch` is the connection-injected
 * `ctx.fetch`. Adds `Content-Type: application/json` for bodies, throws a mapped
 * Error on non-2xx, and returns the raw Response so the caller can `.json()` /
 * `.text()` it. `opName` is the connector tool name, surfaced in errors.
 */
export async function googleDocsFetch(
  fetch: typeof globalThis.fetch,
  url: string,
  init: RequestInit,
  opName: string,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const rawText = await res.text().catch(() => "");
    let body: GoogleErrorBody | null = null;
    try {
      body = rawText ? (JSON.parse(rawText) as GoogleErrorBody) : null;
    } catch {
      body = null;
    }
    throw new Error(mapGoogleError(opName, res.status, body, rawText));
  }
  return res;
}
