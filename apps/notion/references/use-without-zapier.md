# Using Notion with direct credentials

This is the direct-auth path: you hold and pass Notion's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

Notion tokens come from an **internal integration**, created in Notion's developer portal (<https://www.notion.so/my-integrations>, also reachable at <https://www.notion.so/profile/integrations>): sign in as a workspace owner, click **+ New integration**, name it, pick the workspace, and choose its **capabilities** — content (read / update / insert), comments (read / insert), and user information (none / without email / with email) — granting only what the scripts you'll run actually need. These capabilities gate which API calls succeed: a call outside the granted capabilities is rejected even with a valid token, and the user-information capability specifically controls whether `getUser` / `listUsers` return email addresses. Submit to get a static bearer token (an "Internal Integration Secret", prefixed `ntn_`; older integrations may still show the legacy `secret_` prefix) from the integration's Configuration tab. A **public integration** (OAuth) works too — this connector only needs a valid bearer token, however it was minted — but an internal integration is simpler for a single workspace.

However you create it, the token only sees pages and databases **explicitly shared with it**: open each page or database the scripts need, use its **•••** menu → **Connections** (or **Add connections**), and add the integration. A resource that hasn't been shared 404s even with a valid token — reshare it there, not by changing anything about the connector.

`copyPage` needs **two** tokens, one per workspace (`source` and `target`) — create and share each the same way.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector wires a single `env:<ENV_VAR>` resolver for every connection slot (`notion`, and `source` / `target` for `copyPage`): set the token in an environment variable, then pass `--connection env:<ENV_VAR>` (or `{ connection: "env:<ENV_VAR>" }` for the SDK), naming that variable. The value is sent as `Authorization: Bearer <token>`; a bare value with no `env:` prefix is also claimed by this resolver when nothing else matches it. For `copyPage`, set two variables — one per workspace's token — and pass each as its own connection.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
