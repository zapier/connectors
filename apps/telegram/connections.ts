import {
  defineEnvResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

/**
 * Telegram authenticates by carrying the bot token in the request URL PATH:
 * `https://api.telegram.org/bot<token>/<method>` (a header is ignored — the
 * route only exists under `/bot<token>/`). The shared `TELEGRAM_API` base
 * (lib/telegram.ts) carries the literal `{{bot_token}}` placeholder, so scripts
 * build `https://api.telegram.org/bot{{bot_token}}/<method>`.
 *
 *  - Zapier-managed: `zapierConnectionResolver` is used UNWRAPPED. The
 *    `{{bot_token}}` placeholder name must match a field on the Zapier
 *    connection (`bot_token` is the connection's auth field); Relay substitutes
 *    that field's value per request, wherever it sits in the URL — including the
 *    path. A bare UUID-shaped connection value auto-claims this.
 *  - Direct (env): the connection value names an env var holding the bot token
 *    (from @BotFather); the resolver swaps the `{{bot_token}}` placeholder for
 *    that token (there is no Relay to substitute it).
 */
const directTelegramResolver = defineEnvResolver({
  name: "env",
  valueDescription:
    "name of the environment variable holding the bot token; substituted into the {{bot_token}} placeholder in the request URL path. Auto-claims a bare value when that env var is set.",
  build: (token) =>
    ((input, init) => {
      const raw =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : null;
      if (raw === null) return globalThis.fetch(input, init); // Request: pass through
      return globalThis.fetch(raw.replace("{{bot_token}}", token), init);
    }) as typeof globalThis.fetch,
});

export const connectionResolvers = {
  // Zapier resolver used AS-IS — no wrapper. Relay fills {{bot_token}} from the connection.
  telegram: [zapierConnectionResolver, directTelegramResolver],
} as const;
