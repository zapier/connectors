// Shared base URLs and constants for the Google Sheets connector.

/** Google Sheets API v4 base. Every Sheets-host tool builds its URL from here. */
export const SHEETS_BASE = "https://sheets.googleapis.com/v4";

/** Google Drive API v3 base — used only by listSpreadsheets (file discovery). */
export const DRIVE_BASE = "https://www.googleapis.com/drive/v3";

/** Drive mimeType that identifies a Google Sheets spreadsheet. */
export const SPREADSHEET_MIME = "application/vnd.google-apps.spreadsheet";
