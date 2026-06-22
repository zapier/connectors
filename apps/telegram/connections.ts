import {
  defineConnectionResolver,
  defineEnvResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

const TELEGRAM_API_PREFIX = "https://api.telegram.org/";

/**
 * Telegram authenticates by carrying the bot token in the request URL PATH:
 * `https://api.telegram.org/bot<token>/<method>` (a header is ignored — the
 * route only exists under `/bot<token>/`). Scripts call clean method URLs
 * (`https://api.telegram.org/sendMessage`); this wrapper rewrites the URL to
 * insert the `bot<token>/` segment, so the token never appears in a script.
 *
 * `token` is the real bot token in direct mode, or the literal `{{bot_token}}`
 * placeholder in the Zapier-managed path — Zapier's auth layer substitutes the
 * connection's token into the path per request.
 */
function injectBotPath(
  fetchImpl: typeof globalThis.fetch,
  token: string,
): typeof globalThis.fetch {
  return ((input, init) => {
    let url: string;
    if (typeof input === "string") url = input;
    else if (input instanceof URL) url = input.href;
    else return fetchImpl(input, init); // Request objects pass through unchanged
    const rewritten = url.startsWith(TELEGRAM_API_PREFIX)
      ? `${TELEGRAM_API_PREFIX}bot${token}/${url.slice(TELEGRAM_API_PREFIX.length)}`
      : url;
    return fetchImpl(rewritten, init);
  }) as typeof globalThis.fetch;
}

/**
 * Zapier-managed path: wrap the Zapier-routed fetch so the request URL carries
 * the `{{bot_token}}` placeholder; the Zapier auth layer fills in the real
 * token server-side. A bare UUID-shaped connection value auto-claims this.
 */
const zapierTelegramResolver = defineConnectionResolver({
  name: "zapier" as const,
  valuePlaceholder: zapierConnectionResolver.valuePlaceholder,
  valueDescription: zapierConnectionResolver.valueDescription,
  canHandle: zapierConnectionResolver.canHandle,
  resolve: async (value: string) => {
    const zapierFetch = await zapierConnectionResolver.resolve(value);
    return injectBotPath(zapierFetch, "{{bot_token}}");
  },
});

/**
 * Direct mode: the connection value names an env var holding the bot token
 * (from @BotFather); the token is injected into the request URL path.
 */
const directTelegramResolver = defineEnvResolver({
  name: "env",
  valueDescription:
    "name of the environment variable holding the bot token; the token is injected into the request URL path (/bot<token>/). Auto-claims a bare value when that env var is set.",
  build: (token) => injectBotPath(globalThis.fetch, token),
});

export const connectionResolvers = {
  telegram: [zapierTelegramResolver, directTelegramResolver],
} as const;
