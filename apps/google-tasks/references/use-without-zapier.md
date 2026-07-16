# Using Google Tasks with direct credentials

This is the direct-auth path: you hold and pass Google Tasks's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

Register the credential in the [Google Cloud Console](https://console.cloud.google.com/), then run an OAuth 2.0 authorization flow yourself to mint an access token — this connector's direct resolver takes the token itself, not a client id/secret.

1. Create or select a project, then enable the **Google Tasks API** (APIs & Services → Library).
2. Configure the OAuth consent screen (APIs & Services → OAuth consent screen), then create an OAuth 2.0 Client ID (APIs & Services → Credentials → Create Credentials → OAuth client ID) for whichever application type matches how you'll complete the flow (Desktop app for a local script, Web application for a redirect-based flow).
3. Run the OAuth 2.0 flow requesting the `https://www.googleapis.com/auth/tasks` scope — full read/write access across task lists and tasks; the connector doesn't request a narrower one. The read-only `https://www.googleapis.com/auth/tasks.readonly` scope also works if you only need the list/get scripts (`listTaskLists`, `getTaskList`, `listTasks`, `findTask`, `getTask`). For quick testing without writing OAuth client code, Google's [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) can mint a token against either scope.
4. A `403` with reason `insufficientPermissions` means the token's scope is too narrow for the call you made (e.g. a write with only `tasks.readonly`) — mint a new one with the full `tasks` scope. A `401` means the token is invalid or expired — mint a fresh one. See [`references/google-tasks-api-gotchas.md`](google-tasks-api-gotchas.md#auth-scopes) for the full scope/error table.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

Google Tasks's direct-token resolver is `env:<ENV_VAR>` — the value is the name of an environment variable holding the access token from above, sent as `Authorization: Bearer <token>`. It's a fallback: prefer routing through a Zapier connection ([`references/use-with-zapier.md`](use-with-zapier.md)) when you can, since **this resolver does not refresh the token** — Google access tokens expire ~1 hour after issue. Direct mode suits short-lived or testing use; once the token expires, mint a fresh one (see Getting credentials above) or switch to the Zapier-managed connection. (A refresh-token/client-id/client-secret based direct mode is not implemented in this version — only the bare access-token resolver above works.)

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
