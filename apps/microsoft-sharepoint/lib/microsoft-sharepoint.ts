// Shared helpers for the Microsoft SharePoint connector. The Graph API models
// SharePoint over OData, so most tools do the same request/response shaping:
// unwrap the `{ value, @odata.nextLink }` list envelope into the agent-facing
// `{ items, next_cursor }`, switch between the default-library and an explicit
// `driveId` in the path, translate the friendly `limit`/`cursor`/`filter`/…
// params into OData `$top`/`$filter`/… wire params, and map Graph's error codes
// to actionable messages. These live here so every list/file/list-item tool
// applies them identically instead of re-deriving the plumbing per script.

import { ConnectorHttpError, readResponseBody } from "@zapier/connectors-sdk";
import { z } from "zod";

/** Base URL for every Microsoft Graph v1.0 call this connector makes. */
export const GRAPH = "https://graph.microsoft.com/v1.0";

/**
 * The site-scoped drive base. With a `driveId` it targets that specific
 * document library; without one it targets the site's default library
 * (`/sites/{siteId}/drive`) — the shortcut Graph exposes so a caller that only
 * has a site needn't first resolve the default drive.
 */
export function driveBase(siteId: string, driveId?: string): string {
  const site = `${GRAPH}/sites/${encodeURIComponent(siteId)}`;
  return driveId
    ? `${site}/drives/${encodeURIComponent(driveId)}`
    : `${site}/drive`;
}

/**
 * Append query params to a URL, skipping `undefined`/`null`. Array values are
 * appended once per element. Returns the base unchanged when nothing is set.
 */
export function withQuery(
  url: string,
  params: Record<string, string | number | string[] | undefined | null>,
): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.append(key, String(value));
    }
  }
  const query = qs.toString();
  return query ? `${url}?${query}` : url;
}

/**
 * Resolve a list request URL. On the first page, build `baseUrl` with the OData
 * paging/query params. On a follow-up page, `cursor` is the opaque
 * `@odata.nextLink` (a full URL) — fetch it verbatim; never reconstruct
 * `$skiptoken`. Extra `params` (e.g. `$filter`, `$expand`) are applied only to
 * the first page (the nextLink already carries them).
 */
// Every list tool defaults to 20 items when the caller omits `limit` — matches
// what each list tool's `limit` description promises and keeps an unbounded
// page out of the agent's context. Applied here so all list tools share it.
const DEFAULT_LIMIT = 20;

export function listUrl(
  baseUrl: string,
  input: { limit?: number; cursor?: string },
  params: Record<string, string | string[] | undefined> = {},
): string {
  if (input.cursor) return input.cursor;
  return withQuery(baseUrl, { $top: input.limit ?? DEFAULT_LIMIT, ...params });
}

/** The Graph list envelope: a page of `value` plus an optional next-page link. */
interface GraphListEnvelope {
  value?: unknown[];
  "@odata.nextLink"?: string;
}

/**
 * Unwrap Graph's `{ value, @odata.nextLink }` list envelope into the connector's
 * `{ items, next_cursor }` shape. `@odata.nextLink` becomes the opaque
 * `next_cursor` the caller passes back to page the tail; it's absent on the
 * last page. Its key contains `@`/`.`, so it can't be surfaced by a simple
 * field projection — every list tool unwraps the envelope here instead.
 */
export function unwrapList(body: unknown): {
  items: unknown[];
  next_cursor?: string;
} {
  const env = body as GraphListEnvelope;
  const next = env["@odata.nextLink"];
  return {
    items: env.value ?? [],
    ...(next ? { next_cursor: next } : {}),
  };
}

/**
 * Make an authed Graph request. `fetch` is the connection-injected `ctx.fetch`
 * (the resolver chain has already attached the bearer token). Sets
 * `Content-Type: application/json` for JSON bodies, then maps non-2xx responses
 * to a `ConnectorHttpError` — with SharePoint-specific hints for the two errors
 * seen most in production: 403 (a scope isn't consented) and 404 (a stale or
 * malformed id). The full response (status/headers/body) always rides on
 * `error.response`, so the hint augments rather than replaces it.
 *
 * Not for the pre-authenticated upload/download URLs (upload sessions,
 * `@microsoft.graph.downloadUrl`) — those take NO `Authorization` header and are
 * fetched with a bare `fetch`, not this wrapper.
 */
export async function graphFetch(
  fetch: typeof globalThis.fetch,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) await throwGraphError(res);
  return res;
}

/**
 * Read a failed `Response` and throw a `ConnectorHttpError` carrying the full
 * response plus a SharePoint-specific hint for 403 (unconsented scope) and 404
 * (stale/malformed id). Exported for the tools that can't route through
 * `graphFetch` — e.g. `exportFile`, which uses `redirect: "manual"` and so must
 * inspect the response itself before deciding it's an error.
 */
export async function throwGraphError(res: Response): Promise<never> {
  const body = await readResponseBody(res);
  const message = graphErrorHint(res.status, graphErrorCode(body));
  throw ConnectorHttpError.fromResponseBody(
    res,
    body,
    message ? { message } : {},
  );
}

/** Pull Graph's `error.code` out of a parsed error body, if present. */
function graphErrorCode(body: unknown): string | undefined {
  const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
  return typeof code === "string" ? code : undefined;
}

/**
 * The actionable hint for the errors an agent can actually recover from.
 * Returns `undefined` for other statuses so the generic `HTTP <status>` summary
 * (still backed by the full body on `error.response`) is used.
 */
function graphErrorHint(status: number, code?: string): string | undefined {
  const suffix = code ? ` (${code})` : "";
  if (status === 403) {
    return `Microsoft SharePoint: access denied${suffix}. A tenant administrator must consent to the required SharePoint permissions, or reconnect the account with the necessary access.`;
  }
  if (status === 404) {
    return `Microsoft SharePoint: not found${suffix}. The id may be stale (the item moved or was deleted) or the composite site id malformed — re-resolve it via findSites / listDrives / getItem.`;
  }
  if (status === 429 || status === 503) {
    return `Microsoft SharePoint: throttled${suffix}. Wait and retry after the Retry-After interval on the response (it rides on error.response; SharePoint bills a per-tenant resource-unit budget, permission operations costing the most).`;
  }
  return undefined;
}

// ─────────────────────────── shared output schemas ───────────────────────────
// Lifted here because 3+ tools return each shape; keeping one definition means
// every tool that returns a driveItem (or a permission) describes it identically.

/** A file or folder (Graph `driveItem`). Returned by ~9 file/folder tools. */
export const driveItemSchema = z.object({
  id: z.string().describe("File or folder id."),
  name: z.string().describe("File or folder name."),
  webUrl: z.string().describe("Item URL in SharePoint.").optional(),
  size: z.number().int().describe("Size in bytes.").optional(),
  folder: z
    .object({
      childCount: z
        .number()
        .int()
        .describe("Number of direct children.")
        .optional(),
    })
    .describe("Present when the item is a folder.")
    .optional(),
  file: z
    .object({
      mimeType: z.string().describe("File MIME type.").optional(),
    })
    .describe("Present when the item is a file.")
    .optional(),
  parentReference: z
    .object({
      driveId: z.string().describe("Containing drive id.").optional(),
      id: z.string().describe("Parent folder id.").optional(),
      path: z.string().describe("Parent path.").optional(),
    })
    .describe("Where the item lives.")
    .optional(),
  createdDateTime: z
    .string()
    .datetime({ offset: true })
    .describe("When the item was created (ISO 8601).")
    .optional(),
  lastModifiedDateTime: z
    .string()
    .datetime({ offset: true })
    .describe("When the item was last modified (ISO 8601).")
    .optional(),
  "@microsoft.graph.downloadUrl": z
    .string()
    .describe(
      "Short-lived pre-authenticated download URL (files only); fetch it directly with no auth header.",
    )
    .optional(),
});

/** One grantee/link of a sharing permission. Returned by 3 sharing tools. */
export const permissionSchema = z.object({
  id: z.string().describe("Permission id — feed to removeItemPermission."),
  roles: z
    .array(z.string())
    .describe('Granted roles, e.g. ["read"].')
    .optional(),
  link: z
    .object({
      type: z.string().describe("Link type (view/edit/embed).").optional(),
      scope: z
        .string()
        .describe("Link scope (anonymous/organization/users).")
        .optional(),
      webUrl: z.string().describe("The shareable link URL.").optional(),
    })
    .describe("Present for link permissions.")
    .optional(),
  grantedToV2: z
    .object({
      user: z
        .object({
          displayName: z.string().describe("Grantee display name.").optional(),
          email: z.string().describe("Grantee email.").optional(),
        })
        .optional(),
    })
    .describe("The identity this permission was granted to.")
    .optional(),
  grantedToIdentitiesV2: z
    .array(
      z.object({
        user: z
          .object({
            displayName: z
              .string()
              .describe("Grantee display name.")
              .optional(),
            email: z.string().describe("Grantee email.").optional(),
          })
          .optional(),
      }),
    )
    .describe("Identities a link permission was granted to.")
    .optional(),
  shareId: z.string().describe("Share id.").optional(),
  expirationDateTime: z
    .string()
    .datetime({ offset: true })
    .describe("When the grant/link expires (ISO 8601).")
    .optional(),
});

/** A SharePoint list. Returned by listLists + createList. */
export const sharePointListSchema = z.object({
  id: z.string().describe("List id."),
  name: z.string().describe("List name.").optional(),
  displayName: z.string().describe("Human-friendly list title.").optional(),
  description: z.string().describe("List description.").optional(),
  webUrl: z.string().describe("List URL.").optional(),
  list: z
    .object({
      template: z
        .string()
        .describe("List template, e.g. genericList, documentLibrary.")
        .optional(),
      contentTypesEnabled: z
        .boolean()
        .describe("Whether content types are enabled.")
        .optional(),
    })
    .describe("List facet — template and content-type settings.")
    .optional(),
});

/** A list item with its column values. Returned by findListItems + getListItem + createListItem. */
export const listItemSchema = z.object({
  id: z.string().describe("List item id."),
  webUrl: z.string().describe("List item URL.").optional(),
  eTag: z
    .string()
    .describe("Entity tag for optimistic concurrency.")
    .optional(),
  createdDateTime: z
    .string()
    .datetime({ offset: true })
    .describe("When the item was created (ISO 8601).")
    .optional(),
  lastModifiedDateTime: z
    .string()
    .datetime({ offset: true })
    .describe("When the item was last modified (ISO 8601).")
    .optional(),
  fields: z
    .record(z.string(), z.json())
    .describe(
      "Column values keyed by internal column name. Lookup, person, and group columns appear as {Field}LookupId (a numeric id, not the value) unless requested via the columns input.",
    )
    .optional(),
});

/** A site page (Graph `sitePage`). Returned by listPages + getPage + createPage. */
export const sitePageSchema = z.object({
  id: z.string().describe("Page id."),
  name: z.string().describe("Page file name, e.g. home.aspx.").optional(),
  title: z.string().describe("Page title.").optional(),
  webUrl: z.string().describe("Page URL.").optional(),
  description: z.string().describe("Page description.").optional(),
  pageLayout: z.string().describe("Page layout (article/home).").optional(),
  promotionKind: z.string().describe("page or newsPost.").optional(),
  publishingState: z
    .object({
      level: z.string().describe("draft or published.").optional(),
    })
    .describe("Publishing state.")
    .optional(),
});

/** The `{ success: true }` shape synthesized for 204-no-body operations. */
export const successSchema = z.object({
  success: z.literal(true).describe("True when the operation succeeded."),
});

// ─────────────────────────── resumable upload ───────────────────────────
// uploadFile and replaceFile both stream bytes through SharePoint's resumable
// upload session: open a session against Graph (authed), then PUT the bytes to
// the returned pre-authenticated upload URL with NO Authorization header (Graph
// 401s if one is sent). The helper below is the shared 3-step orchestration.

// 10 × 320 KiB — a multiple of Microsoft's required 320 KiB fragment size and
// comfortably under the 60 MiB per-PUT ceiling.
const UPLOAD_CHUNK_BYTES = 10 * 320 * 1024;

/**
 * Upload `bytes` to `sessionUrl` via a resumable upload session and return the
 * finalized `driveItem`. `authedFetch` is `ctx.fetch` (used only to open the
 * session); the chunk PUTs go to the session's pre-authenticated `uploadUrl`
 * with a bare `fetch` and no auth header. `conflictBehavior` is applied to the
 * session's item metadata.
 */
export async function uploadToSession(
  authedFetch: typeof globalThis.fetch,
  sessionUrl: string,
  bytes: Uint8Array,
  conflictBehavior: "rename" | "replace" = "rename",
): Promise<unknown> {
  // A 0-byte file can't go through an upload session — there's no valid
  // Content-Range for an empty body, so Graph 400s. Create it with a simple
  // authed PUT to .../content instead (the same mechanism uploadTextFile uses).
  // The content URL is the session URL with its trailing segment swapped, which
  // holds for both callers ({name}:/createUploadSession and
  // items/{id}/createUploadSession).
  if (bytes.byteLength === 0) {
    const contentUrl = withQuery(
      sessionUrl.replace(/\/createUploadSession$/, "/content"),
      { "@microsoft.graph.conflictBehavior": conflictBehavior },
    );
    const res = await graphFetch(authedFetch, contentUrl, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: "",
    });
    return res.json();
  }

  const sessionRes = await graphFetch(authedFetch, sessionUrl, {
    method: "POST",
    body: JSON.stringify({
      item: { "@microsoft.graph.conflictBehavior": conflictBehavior },
    }),
  });
  const uploadUrl = ((await sessionRes.json()) as { uploadUrl?: string })
    .uploadUrl;
  if (!uploadUrl) {
    throw new Error(
      "Microsoft SharePoint upload: createUploadSession returned no uploadUrl.",
    );
  }

  const total = bytes.byteLength;
  let finalBody: unknown;
  for (let start = 0; start < total; start += UPLOAD_CHUNK_BYTES) {
    const end = Math.min(start + UPLOAD_CHUNK_BYTES, total);
    const chunk = bytes.subarray(start, end);
    // No Authorization header — the upload URL is already pre-authenticated.
    // Content-Length is set automatically from the body.
    const res = await globalThis.fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Range": `bytes ${start}-${end - 1}/${total}` },
      body: chunk,
    });
    if (!res.ok) {
      const body = await readResponseBody(res);
      throw ConnectorHttpError.fromResponseBody(res, body, {
        message: `Microsoft SharePoint upload: chunk PUT failed at bytes ${start}-${end - 1}/${total}.`,
      });
    }
    // 200/201 on the final chunk carries the created driveItem; 202 in between.
    if (res.status === 200 || res.status === 201) {
      finalBody = await res.json();
    }
  }
  return finalBody;
}
