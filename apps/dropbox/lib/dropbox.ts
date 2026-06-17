// Shared Dropbox helpers used across every script.
//
// Why this exists: Dropbox's API is generated from the Stone IDL, where unions and
// enums serialize with a `.tag` discriminator on BOTH sides of the wire. Request
// enums travel as `{ ".tag": "<value>" }`; responses carry a `.tag` discriminator on
// file/folder metadata and link objects. The agent surface uses plain enum strings
// and a clean `type` field, so every script has to wrap requests and unwrap responses
// — the wrap/unwrap, the `error_summary` → message mapping, and the team-space path
// header are identical across tools, so they live here rather than drifting per file.
//
// Also home to the shared response schemas (Entry, SharedLink, FileRequest) returned
// by 3+ tools, so the agent sees the same shape regardless of which tool returned it.

import { z } from "zod";

export const API_BASE = "https://api.dropboxapi.com";
export const CONTENT_BASE = "https://content.dropboxapi.com";

// ───────────────────────── Shared response schemas ─────────────────────────
// Plain z.object — unknown keys are stripped on parse (the connectors-ref validator
// rejects untyped passthrough).

/**
 * Metadata for a file or folder. Returned by createFolder, moveFile, copyFile,
 * deletePath, getFileMetadata, and (in arrays) listFolder + searchFiles. The wire
 * `.tag` discriminator is surfaced as the clean `type` field by `mapEntry`.
 */
export const entrySchema = z.object({
  type: z
    .string()
    .describe('Item type — "file", "folder", or "deleted".')
    .optional(),
  id: z
    .string()
    .describe(
      "Stable Dropbox id (e.g. id:abc123); usable anywhere a path is accepted.",
    )
    .optional(),
  name: z.string().describe("The item's name, including extension."),
  path_lower: z
    .string()
    .describe("Lowercased path — the case-insensitive key for the item.")
    .optional(),
  path_display: z
    .string()
    .describe("Path with original casing, for display.")
    .optional(),
  size: z
    .number()
    .int()
    .describe("File size in bytes (files only).")
    .optional(),
  rev: z
    .string()
    .describe("Revision id of the file's current content (files only).")
    .optional(),
  content_hash: z
    .string()
    .describe("Dropbox content hash (files only).")
    .optional(),
  client_modified: z
    .string()
    .datetime({ offset: true })
    .describe(
      "ISO-8601 time the file was last modified by a client (files only).",
    )
    .optional(),
  server_modified: z
    .string()
    .datetime({ offset: true })
    .describe("ISO-8601 time Dropbox last received the file (files only).")
    .optional(),
});

/** A shared link, returned by createSharedLink, modifySharedLinkSettings, listSharedLinks. */
export const sharedLinkSchema = z.object({
  url: z.string().describe("The shareable link URL (ends in ?dl=0)."),
  url_download: z
    .string()
    .describe("Direct-download variant of url (?dl=1); present for files.")
    .optional(),
  type: z.string().describe('"file" or "folder".').optional(),
  name: z.string().optional(),
  id: z.string().optional(),
  path_lower: z.string().optional(),
  visibility: z
    .string()
    .describe("Resolved visibility — public, team_only, password, etc.")
    .optional(),
  expires: z
    .string()
    .datetime({ offset: true })
    .describe("ISO-8601 expiration time, if the link expires.")
    .optional(),
});

/** A file request, returned by createFileRequest and listFileRequests. */
export const fileRequestSchema = z.object({
  id: z.string().describe("File request id."),
  url: z
    .string()
    .describe(
      "Public upload page URL, e.g. https://www.dropbox.com/request/abc123.",
    ),
  title: z.string(),
  destination: z.string().describe("Folder path where uploads land."),
  created: z
    .string()
    .datetime({ offset: true })
    .describe("ISO-8601 creation time.")
    .optional(),
  is_open: z
    .boolean()
    .describe("Whether the request is currently accepting uploads.")
    .optional(),
  file_count: z
    .number()
    .int()
    .describe("Number of files uploaded so far.")
    .optional(),
  description: z.string().optional(),
});

// ───────────────────────── Union (.tag) wrap / unwrap ─────────────────────────

/** Wrap a plain enum string as a Stone union: "public" → { ".tag": "public" }. */
export function tagged(value: string): { ".tag": string } {
  return { ".tag": value };
}

/**
 * Unwrap a wire metadata object's `.tag` discriminator into a clean `type` field.
 * `{ ".tag": "file", name: "x" }` → `{ type: "file", name: "x" }`. Pass-through for
 * anything that isn't a tagged object.
 */
export function mapEntry(raw: unknown): Record<string, unknown> {
  if (raw == null || typeof raw !== "object") return {};
  const { [".tag"]: tag, ...rest } = raw as Record<string, unknown>;
  return typeof tag === "string" ? { type: tag, ...rest } : { ...rest };
}

/** A shared link's `?dl=0` URL → its `?dl=1` direct-download variant. */
export function toDownloadUrl(url: string): string {
  if (/[?&]dl=0\b/.test(url)) return url.replace(/dl=0/, "dl=1");
  return url + (url.includes("?") ? "&" : "?") + "dl=1";
}

/** Unwrap a shared-link wire object (`.tag` → `type`) and add the `url_download` variant. */
export function mapSharedLink(raw: unknown): Record<string, unknown> {
  const mapped = mapEntry(raw);
  if (typeof mapped.url === "string") {
    mapped.url_download = toDownloadUrl(mapped.url);
  }
  return mapped;
}

// ───────────────────────── Team-space targeting ─────────────────────────

/**
 * Description shared by the optional `namespace_id` input on every path-operating
 * tool. Lifted into the Dropbox-API-Path-Root header by `pathRootHeader`.
 */
export const NAMESPACE_ID_DESCRIBE =
  "Optional team-space namespace id. Set it to act inside a Dropbox team space " +
  "instead of your personal home space; resolve it from getCurrentAccount " +
  "(root_namespace_id = team space, home_namespace_id = personal). Omit for personal accounts.";

/**
 * Build the Dropbox-API-Path-Root header for a team-space-targeted request. Returns
 * an empty object (home space) when no namespace id is given.
 */
export function pathRootHeader(namespaceId?: string): Record<string, string> {
  if (!namespaceId) return {};
  return {
    "Dropbox-API-Path-Root": JSON.stringify({
      ".tag": "namespace_id",
      namespace_id: namespaceId,
    }),
  };
}

/** Escape non-ASCII characters for the ASCII-only Dropbox-API-Arg header (content endpoints). */
export function apiArgHeader(args: Record<string, unknown>): string {
  let out = "";
  for (const ch of JSON.stringify(args)) {
    const code = ch.codePointAt(0) ?? 0;
    out += code > 0x7f ? "\\u" + code.toString(16).padStart(4, "0") : ch;
  }
  return out;
}

// ───────────────────────── Errors ─────────────────────────

/**
 * A Dropbox API error. Carries the `error_summary` prefix so callers can detect
 * soft-success cases (e.g. createSharedLink's `shared_link_already_exists`) without
 * re-parsing the body.
 */
export class DropboxApiError extends Error {
  tool: string;
  status: number;
  summary: string;
  constructor(tool: string, status: number, summary: string) {
    super(buildErrorMessage(tool, status, summary));
    this.name = "DropboxApiError";
    this.tool = tool;
    this.status = status;
    this.summary = summary;
  }
}

// error_summary prefix → actionable, agent-facing hint. Checked as a prefix match.
const ERROR_HINTS: Array<[string, string]> = [
  ["path/not_found", "File or folder not found at that path."],
  ["path_lookup/not_found", "File or folder not found at that path."],
  ["from_lookup/not_found", "Source file or folder not found at that path."],
  [
    "path/malformed_path",
    'Invalid Dropbox path — it must start with "/" (use "" for the account root, never "/") and use valid characters.',
  ],
  [
    "path/conflict",
    "An item already exists at that path — pass autorename:true to save a numbered variant, or choose another path.",
  ],
  ["path/insufficient_space", "Not enough Dropbox storage space."],
  [
    "path/disallowed_name",
    "That name is reserved by Dropbox — choose another.",
  ],
  [
    "too_many_write_operations",
    "Too many concurrent writes to this folder — Dropbox serializes writes per folder; back off and retry.",
  ],
  [
    "too_many_requests",
    "Rate limited by Dropbox — retry after the Retry-After interval.",
  ],
  [
    "missing_scope",
    "Reconnect Dropbox with the required permission — the token is missing a needed scope.",
  ],
  ["invalid_grant", "Dropbox connection expired — reconnect."],
  [
    "invalid_root",
    "That Dropbox space isn't accessible — check the namespace_id from getCurrentAccount.",
  ],
  [
    "no_permission",
    "No permission for that Dropbox space — check the namespace_id from getCurrentAccount.",
  ],
  [
    "settings_error",
    "That shared-link setting isn't available on this account — some visibility/expiration/password options require a paid Dropbox plan.",
  ],
  [
    "invalid_account_type",
    "That feature requires a paid Dropbox plan (e.g. file-request deadlines).",
  ],
];

function buildErrorMessage(
  tool: string,
  status: number,
  summary: string,
): string {
  const detail = summary || "unknown error";
  const hint = ERROR_HINTS.find(([prefix]) => summary.startsWith(prefix))?.[1];
  return `Dropbox ${tool} ${status}: ${detail}${hint ? ` — ${hint}` : ""}`;
}

/**
 * Throw a mapped `DropboxApiError` (with the error_summary and an actionable hint) on a
 * non-2xx status; no-op on success. Use directly on content endpoints (download/upload),
 * where the success body is raw bytes or empty and must be read by the caller.
 */
export async function throwIfDropboxError(
  tool: string,
  res: { ok: boolean; status: number; text: () => Promise<string> },
): Promise<void> {
  if (res.ok) return;
  let summary = "";
  try {
    const body = JSON.parse(await res.text()) as { error_summary?: unknown };
    if (typeof body.error_summary === "string") summary = body.error_summary;
  } catch {
    // non-JSON error body — leave summary empty; the status still informs the agent.
  }
  throw new DropboxApiError(tool, res.status, summary);
}

/**
 * Parse a Dropbox JSON response, throwing a `DropboxApiError` (with the error_summary and
 * a mapped hint) on a non-2xx status, and returning the JSON body otherwise.
 */
export async function readDropbox<T = Record<string, unknown>>(
  tool: string,
  res: {
    ok: boolean;
    status: number;
    text: () => Promise<string>;
    json: () => Promise<unknown>;
  },
): Promise<T> {
  await throwIfDropboxError(tool, res);
  return (await res.json()) as T;
}

// ───────────────────────── Soft success ─────────────────────────

/**
 * Canonical soft-success return: a postcondition was already satisfied, so we return
 * success-with-flag instead of throwing. The `alreadySatisfied` flag name is fixed
 * across the connector; the upstream code goes in `alreadySatisfiedReason`.
 */
export function softSuccess<T extends Record<string, unknown>>(
  reason: string,
  fields: T,
): { alreadySatisfied: true; alreadySatisfiedReason: string } & T {
  return { alreadySatisfied: true, alreadySatisfiedReason: reason, ...fields };
}
