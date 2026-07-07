// Microsoft Graph authorizes every SharePoint call — read or write, files or
// lists or pages — with a single OAuth 2.0 bearer token. There is no bot/user
// split and no per-request credential switch: every tool uses the same
// connection (`microsoft-sharepoint`), resolved by the standard chain
// (Zapier-managed first, direct env-token fallback). This is the same auth
// model the microsoft-outlook connector uses on the same graph.microsoft.com
// host. The per-request headers SharePoint needs (Prefer on list-item reads,
// no Authorization on pre-authenticated upload/download URLs) are set by the
// individual scripts, not here — this file is auth only.
//
// Env vars a caller references in the connection string:
//   MICROSOFT_SHAREPOINT_ZAPIER_CONNECTION_ID  → --connection zapier:<id>
//   MICROSOFT_SHAREPOINT_ACCESS_TOKEN          → --connection env:MICROSOFT_SHAREPOINT_ACCESS_TOKEN

import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  "microsoft-sharepoint": [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
