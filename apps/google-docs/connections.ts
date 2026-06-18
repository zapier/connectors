import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

// Single OAuth credential for both hosts. Google Docs uses one OAuth 2.0 access
// token (auto-refreshed); the granted scopes span the Docs API
// (docs.googleapis.com) and the Drive API (www.googleapis.com), so the same
// connection authorizes every tool — the Drive-host tools just use the absolute
// Drive URL. No bot/user split, no per-request token switching.
export const connectionResolvers = {
  "google-docs": [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
