import { ConnectorHttpError, readResponseBody } from "@zapier/connectors-sdk";

export const TRELLO_BASE = "https://api.trello.com/1";

export const TRELLO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Throw a `ConnectorHttpError` for a non-ok Trello response. The full response
 * (status, headers, body) rides along on `error.response` and renders in
 * `toString()` — so an unrecognized error body (e.g. an edge/proxy failure) is
 * surfaced intact instead of collapsing to a derived one-liner. The message
 * names the call site and adds a recovery hint for the two statuses an agent
 * can act on; the body is captured, not inlined.
 */
export async function trelloError(tool: string, res: Response): Promise<never> {
  const body = await readResponseBody(res);
  let hint = "";
  if (res.status === 404) {
    hint = " — verify the id exists and you have access.";
  } else if (res.status === 401) {
    hint = " — check Trello auth credentials.";
  }
  throw ConnectorHttpError.fromResponseBody(res, body, {
    message: `Trello ${tool} ${res.status}${hint}`,
  });
}

/** Build application/x-www-form-urlencoded body for Trello write endpoints. */
export function trelloFormBody(
  fields: Record<string, string | number | boolean | undefined | null>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  return params.toString();
}

export const trelloFormHeaders = {
  "Content-Type": "application/x-www-form-urlencoded",
};

/** Case-insensitive substring match for find-* tools. */
export function nameContains(name: string, query: string): boolean {
  return name.toLowerCase().includes(query.toLowerCase());
}
