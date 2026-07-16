# Using Telegram from the command line

This is the standalone/terminal shape: you can run `node` and execute files directly.

## Install

See [`SKILL.md`](../SKILL.md#setup) for the one-time `npm install --omit=dev` needed here. After that, invoke `cli.js` by path from anywhere; no need to `cd` here first. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`. On older Node, run `node cli.js --help` anyway: it detects your runtime and prints how to run without upgrading (build it locally, use the prebuilt npm package, or another runtime) — don't skip the connector just because Node is old.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Running a script

After `npm install --omit=dev`, run a script by name with `node cli.js run <script>`, or execute its file directly — both take the same arguments and both accept `--help`. Always run a script's `--help` first to learn its exact input schema and connections, then invoke it:

```bash
# default — via the entry point; self-checks readiness and prints friendly diagnostics
node cli.js run <script> '<input-json>' --connection [<resolver>:]<value>
# from elsewhere — cli.js is executable, so a path to it works from any cwd; no `cd` needed
<path-to-connector>/cli.js run <script> '<input-json>' --connection [<resolver>:]<value>
# shorthand — runs the script file directly (same args, same Node 22.18+ need, no readiness check)
./scripts/<script>.ts '<input-json>' --connection [<resolver>:]<value>
```

## Auth

Pass a connection with `--connection [<resolver>:]<value>` — see [`SKILL.md`](../SKILL.md#auth) for the resolver model. `zapier:<connection-id>` (Zapier-managed auth) always works; run `node cli.js run <script> --help` to see every resolver this connector accepts. If `TS_KEYRING_BACKEND=file` was needed during login (see [`references/use-with-zapier.md`](use-with-zapier.md)), every `zapier:` call needs it too — set it inline on each command rather than assuming an earlier `export` carried over.

## Output

Every script prints the `{ data, meta }` envelope described in [`SKILL.md`](../SKILL.md#output-format) as JSON to stdout. Append `--skipOutputDataValidation` to get the raw, unvalidated result, or `--filterOutputData '<jq>'` to trim `data` down to the fields you need.
