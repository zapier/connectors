# Using Notion as an imported dependency

This is the your-own-code shape: you're importing this package directly instead of running it as a subprocess or MCP server.

## Install

```bash
npm install @zapier/notion-connector
```

## Calling a script

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function:

```ts
import { <script> } from "@zapier/notion-connector";

const result = await <script>(<input>, { connection: "zapier:<connection-id>" });
```

## Auth

Pass a connection as the `connection` field of the second (`opts`) argument — see [`SKILL.md`](../SKILL.md#auth) for the resolver model. `"zapier:<connection-id>"` (Zapier-managed auth) always works; check this connector's other accepted resolvers before assuming a direct-token one applies. If `TS_KEYRING_BACKEND=file` was needed during login (see [`references/use-with-zapier.md`](use-with-zapier.md)), set it in your own process's environment too — every call resolving a `zapier:` connection reads the same keyring.

## Output

Every call resolves to the `{ data, meta }` envelope described in [`SKILL.md`](../SKILL.md#output-format). Pass `{ skipOutputDataValidation: true }` / `{ filterOutputData: "<jq>" }` in `opts` for the same escape hatches.
