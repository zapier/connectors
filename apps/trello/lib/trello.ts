export const TRELLO_BASE = "https://api.trello.com/1";

export const TRELLO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export async function trelloError(tool: string, res: Response): Promise<never> {
  const errBody = await res.text();
  let hint = "";
  if (res.status === 404) {
    hint = " Verify the id exists and you have access.";
  } else if (res.status === 401) {
    hint = " Check Trello auth credentials.";
  }
  throw new Error(`Trello ${tool} ${res.status}: ${errBody}${hint}`);
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
