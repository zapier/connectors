// Microsoft Graph authorizes every OneDrive call — read or write, files or
// folders or sharing — with a single OAuth 2.0 bearer token. There is no
// bot/user split and no per-request credential switch: every tool uses the same
// connection (`microsoft-onedrive`), resolved by the standard chain
// (Zapier-managed first, direct env-token fallback). This is the same auth
// model the microsoft-sharepoint / microsoft-outlook connectors use on the same
// graph.microsoft.com host. The per-request headers OneDrive needs (no
// Authorization on pre-authenticated upload/download URLs) are set by the
// individual scripts, not here — this file is auth only.
//
// Env vars a caller references in the connection string:
//   MICROSOFT_ONEDRIVE_ZAPIER_CONNECTION_ID  → --connection zapier:<id>
//   MICROSOFT_ONEDRIVE_ACCESS_TOKEN          → --connection env:MICROSOFT_ONEDRIVE_ACCESS_TOKEN

import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  "microsoft-onedrive": [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
