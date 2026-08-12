# Using Harvest with direct credentials

This is the direct-auth path: you hold and pass Harvest's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

<!-- BEGIN:use-without-zapier-getting-credentials -->

Harvest offers two direct credential types. For a single account you own, a **Personal Access Token (PAT)** is simplest: "The API can be accessed by creating a Personal Access Token from the [Developers](https://id.getharvest.com/developers) section of Harvest ID. After creating it you'll be provided with a random token and a list of your account IDs." ([Authentication](https://help.getharvest.com/api-v2/authentication-api/authentication/authentication/)) You need **both** halves — the token and one **account id** from that list (a single Harvest login can belong to several accounts; the account id selects which one the token acts on).

The token authenticates via two headers, "`Authorization: Bearer $ACCESS_TOKEN`" and "`Harvest-Account-Id: $ACCOUNT_ID`."

If you're building an integration "that other users can use, you will need to register an OAuth2 Application" instead ([Authentication](https://help.getharvest.com/api-v2/authentication-api/authentication/authentication/)); an OAuth2 access token is passed with the same two headers. For which token to use on identity-sensitive calls (e.g. logging time on behalf of a teammate), see [`harvest-api-gotchas.md`](harvest-api-gotchas.md#current-user).

<!-- END:use-without-zapier-getting-credentials -->

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

<!-- BEGIN:use-without-zapier-passing-credential -->

This connector's direct resolver is `token`. It reads the credential from **two** environment variables sharing a prefix you choose: `<PREFIX>_ACCESS_TOKEN` (the PAT or OAuth access token) and `<PREFIX>_ACCOUNT_ID` (the numeric account id). For example, with prefix `HARVEST`, set `HARVEST_ACCESS_TOKEN` and `HARVEST_ACCOUNT_ID`, then pass `token:HARVEST` as the connection value. The resolver injects `Authorization: Bearer <token>` and `Harvest-Account-Id: <account id>` on every request. When both env vars are set, a bare prefix value auto-claims this resolver, so `HARVEST` alone also works.

<!-- END:use-without-zapier-passing-credential -->

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
