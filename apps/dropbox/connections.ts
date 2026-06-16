import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

// Single Dropbox OAuth2 connection. Dropbox issues one identity per token (no
// bot/user split); capability is gated by OAuth scopes granted at connect time.
// The Zapier-managed path holds the refresh token and rotates the short-lived
// (~4h) access token above the injected Authorization header, so the connector
// just sends whatever bearer it is handed. Direct mode uses a static
// DROPBOX_ACCESS_TOKEN, which expires after ~4h unless re-minted (the SDK has no
// refresh-aware resolver yet — documented in SKILL.md § Auth).
export const connectionResolvers = {
  dropbox: [
    zapierConnectionResolver,
    defineEnvTokenResolver({ name: "access-token" }),
  ],
} as const;
