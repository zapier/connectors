# Using Dropbox as an imported dependency

This is the your-own-code shape: you're importing this package directly instead of running it as a subprocess or MCP server.

## Install

```bash
npm install @zapier/dropbox-connector
```

## Calling a script

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function:

```ts
import { <script> } from "@zapier/dropbox-connector";

const result = await <script>(<input>, { connection: "zapier:<connection-id>" });
```

## Auth

Pass a connection as the `connection` field of the second (`opts`) argument — see [`SKILL.md`](../SKILL.md#auth) for the resolver model. `"zapier:<connection-id>"` (Zapier-managed auth) always works; check this connector's other accepted resolvers before assuming a direct-token one applies.

## Output

Every call resolves to the `{ data, meta }` envelope described in [`SKILL.md`](../SKILL.md#output-format). Pass `{ skipOutputDataValidation: true }` / `{ filterOutputData: "<jq>" }` in `opts` for the same escape hatches.
