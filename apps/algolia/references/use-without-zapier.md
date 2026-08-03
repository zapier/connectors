# Using Algolia with direct credentials

This is the direct-auth path: you hold and pass Algolia's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

Algolia uses two values, both found in the [Algolia dashboard](https://dashboard.algolia.com/) under **Settings → API Keys**:

- **Application ID** — identifies your Algolia app (it's also part of the request host).
- **API key** — an ACL-scoped key. Pick one whose permissions match what you'll do:
  - a **Search-only** key drives every read tool (search, browse, get, list, settings-read);
  - a **write/admin** key (or a custom key with `addObject`/`editSettings`/`deleteObject`/`deleteIndex` ACLs) is required for the write tools.

  A search-only key returns a clear `403` if used for a write. Keys are long-lived — no OAuth, no refresh. You can create purpose-scoped keys via **API Keys → New API Key**. What each ACL gates and how identity/limits behave is in [`references/algolia-api-gotchas.md`](algolia-api-gotchas.md#auth--api-key-acls).

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector has one resolver, `algolia`, which reads **two** env vars under a prefix you name. Pass `--connection algolia:ALGOLIA`, and set:

- `ALGOLIA_APPLICATION_ID` — your Application ID
- `ALGOLIA_API_KEY` — your API key

(The prefix `ALGOLIA` is what the resolver expands to `ALGOLIA_APPLICATION_ID` / `ALGOLIA_API_KEY`; if you prefer a different prefix, pass e.g. `--connection algolia:MYAPP` and set `MYAPP_APPLICATION_ID` / `MYAPP_API_KEY`.) There is no Zapier-managed (`zapier:<id>`) resolver for this connector.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
