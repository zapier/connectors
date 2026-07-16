# Using Elevenlabs with direct credentials

This is the direct-auth path: you hold and pass Elevenlabs's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

ElevenLabs has no OAuth app registration flow — a credential here is a plain API key, minted from an ElevenLabs account (there's no separate developer-app step first).

- **Personal key** — sign in at [elevenlabs.io](https://elevenlabs.io), then go to [Settings → API Keys](https://elevenlabs.io/app/settings/api-keys) (profile icon → Settings → API Keys) and create one. Requires the account hold a Full Seat.
- **Workspace/service-account key** — for a multi-seat workspace, an admin can mint a key scoped to a service account instead of a person: profile icon → Workspace settings → Service Accounts tab.

Either way, the key can carry restrictions set at creation time: a **scope** limiting which API endpoints it can call, a **credit quota** capping usage, and an **IP allowlist** (1-100 CIDR entries). A valid key can still get a 401 on an endpoint outside its granted scope, so check the key's own restrictions before assuming it's dead or revoked.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector's `elevenlabs` connection accepts one direct-token resolver: **`env:<ENV_VAR>`** — `<ENV_VAR>` names an environment variable holding the raw ElevenLabs API key; the connector sends it as the API's `xi-api-key` header (not `Authorization: Bearer`). `ELEVENLABS_API_KEY` is the conventional name, but any env-var name works.

Zapier-managed connections can't forward multipart request bodies yet, so the three audio-upload scripts — `speechToSpeech`, `speechToText`, and `isolateAudio` — require this direct mode; all other scripts work over either resolver.

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
