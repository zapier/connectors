// Shared Notion id normalization. Notion ids are UUIDs accepted with or without
// dashes; the API also embeds them as the trailing 32 hex chars of a page URL
// (notion.so/Title-<32hex>). Agents and users routinely paste a full URL — or a
// dashless id — where a plain id is expected, so normalize at the run() boundary
// before building the request URL.

const DASHLESS_UUID = /[0-9a-f]{32}/i;

/**
 * Normalize a Notion id to the canonical dashed UUID form.
 *
 * - A dashed UUID is returned unchanged.
 * - A pasted Notion URL (or any string ending in 32 hex chars, optionally
 *   followed by `?`/`#`) has its trailing id extracted and dashed.
 * - A bare 32-hex id is dashed.
 * - Anything else (no recognizable id) is returned trimmed, as-is, so the API
 *   can surface its own validation error.
 */
export function normalizeNotionId(value: string): string {
  const input = value.trim();

  // Already a dashed UUID (8-4-4-4-12).
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input,
    )
  ) {
    return input;
  }

  // Pull the last run of 32 hex chars (the id in a URL, or a bare dashless id).
  const matches = input.match(new RegExp(DASHLESS_UUID, "gi"));
  const hex = matches?.[matches.length - 1];
  if (!hex) return input;

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
