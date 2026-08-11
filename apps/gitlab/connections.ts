import {
  defineEnvResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

/**
 * Direct-mode auth: a GitLab personal, project, or group access token, sent via
 * the `PRIVATE-TOKEN` header (GitLab's convention for access tokens). OAuth is
 * supported through the Zapier-managed connection at the front of the chain,
 * where the managed auth layer injects the credential per request.
 *
 * A single connection covers both a full-access (`api` scope) and a read-only
 * (`read_api` scope) token — the scope is a property of the token the user
 * mints, not of the connector.
 */
const gitlabTokenResolver = defineEnvResolver({
  name: "env",
  valueDescription:
    "name of the env var holding a GitLab access token (personal, project, or group); sent as the PRIVATE-TOKEN header",
  build: (token) =>
    ((input, init = {}) => {
      // Direct-mode host override for self-managed / Dedicated instances.
      // Scripts build gitlab.com URLs; rewrite the host when GITLAB_HOST is set.
      const host = process.env.GITLAB_HOST?.replace(/^https?:\/\//, "").replace(
        /\/+$/,
        "",
      );
      let target: typeof input = input;
      if (host && host !== "gitlab.com") {
        const raw =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : null;
        if (raw)
          target = raw.replace("https://gitlab.com/", `https://${host}/`);
      }
      return globalThis.fetch(target, {
        ...init,
        headers: { ...(init?.headers ?? {}), "PRIVATE-TOKEN": token },
      });
    }) as typeof globalThis.fetch,
});

export const connectionResolvers = {
  gitlab: [zapierConnectionResolver, gitlabTokenResolver],
} as const;
