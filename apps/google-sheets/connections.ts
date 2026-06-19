import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

// Google Sheets uses OAuth 2.0 with a single access token (auto-refreshed).
// One connection slot covers every tool — the same bearer token authorizes both
// the Sheets host (sheets.googleapis.com) and the Drive host (www.googleapis.com,
// used by listSpreadsheets). Zapier-managed auth (zapierConnectionResolver) handles
// token refresh; direct mode sends a short-lived token via Authorization: Bearer.
export const connectionResolvers = {
  "google-sheets": [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
