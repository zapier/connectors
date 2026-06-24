// Accept-URL-or-ID normalizer. Every tool takes `spreadsheet` as either a raw
// spreadsheet id or a full Google Sheets URL; run() normalizes to the bare id.
// Production traffic shows users routinely paste the full URL.

const SHEETS_URL_RE = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

/**
 * Return the bare spreadsheet id from either a raw id or a full Sheets URL
 * (`https://docs.google.com/spreadsheets/d/<id>/edit#gid=0`).
 */
export function normalizeSpreadsheetId(idOrUrl: string): string {
  const match = idOrUrl.match(SHEETS_URL_RE);
  if (match) return match[1];
  return idOrUrl.trim();
}
