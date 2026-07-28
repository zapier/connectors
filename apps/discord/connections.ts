import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

// Discord authenticates every request with a bot token sent as
// `Authorization: Bot <token>` — note the `Bot ` scheme word, not `Bearer`.
// The token is static and long-lived (it never expires unless regenerated in
// the Discord Developer Portal), which is why the connector uses it directly
// rather than an OAuth flow.
//
//  - Zapier-managed: `zapierConnectionResolver` is used as-is. The Zapier auth
//    layer injects the `Authorization: Bot <token>` header per request
//    (verified against the production auth template).
//  - Direct mode: `defineEnvTokenResolver({ scheme: "Bot" })` reads the bot
//    token from the env var named by the connection string and emits the same
//    `Authorization: Bot <token>` header — e.g. `--connection env:DISCORD_BOT_TOKEN`.
const directDiscordResolver = defineEnvTokenResolver({ scheme: "Bot" });

export const connectionResolvers = {
  discord: [zapierConnectionResolver, directDiscordResolver],
} as const;
