// Hosts and shared limits for the Google Docs connector.
//
// Two hosts are in play on one OAuth credential: the Docs API
// (docs.googleapis.com) for document content + batchUpdate, and the Drive API
// (www.googleapis.com) for find / export / copy-template / folder placement.

/** Google Docs API v1 base. Document content + batchUpdate live here. */
export const DOCS_BASE = "https://docs.googleapis.com/v1";

/** Google Drive API v3 base. find / export / copy / create-in-folder live here. */
export const DRIVE_BASE = "https://www.googleapis.com/drive/v3";

/** The Drive mime type for a Google Doc — used in find queries and create-in-folder. */
export const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";

/**
 * getDocument's flattened-text budget. Once the readable text reaches this many
 * UTF-16 characters (~12k tokens), the remaining structural elements are dropped
 * and `truncated` is set so the agent re-reads a range or uses exportDocument.
 */
export const GET_DOCUMENT_CHAR_BUDGET = 50_000;

/** Build the canonical edit URL for a document id (the Docs API doesn't return one on create). */
export function documentUrl(documentId: string): string {
  return `https://docs.google.com/document/d/${documentId}/edit`;
}
