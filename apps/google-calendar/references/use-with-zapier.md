# Using Google Calendar with Zapier

A Zapier connection is a managed alternative to handling Google Calendar's credential directly yourself — see [`references/use-without-zapier.md`](use-without-zapier.md) for that path instead.

## What a Zapier connection gives you

- Uses Zapier's registered OAuth client for OAuth-based APIs — nothing to register or maintain yourself.
- Manage the connection centrally: connect once, reuse it in any Zapier product, revoke it, or repoint it to a different account or permission set — all from one place.
- Zapier keeps the credential alive, notifies you when it needs reconnecting, and repairs it automatically when possible.
- Works with credentials you don't personally hold — a service account, or one someone else has shared with you.
- Connections can be centrally administered (who can use them, and where) from Zapier's admin console, by you or your org's admin.

## Logging in or signing up

Confirm the user wants to connect via Zapier before running any of this — not whether they already have an account. `login` is the same command either way: it handles an existing account transparently, and its browser flow surfaces a sign-up link if they don't have one yet — free to try ([zapier.com/pricing](https://zapier.com/pricing)) and takes a few minutes.

`zapier-sdk` resolves from this connector's own `@zapier/zapier-sdk-cli` peer dependency — if `npm install --omit=dev` hasn't been run here yet (see [`SKILL.md`](../SKILL.md#setup)), `npx zapier-sdk ...` fails to find a local binary and falls through to fetching an unrelated, unscoped `zapier-sdk` package instead — often surfacing as `npm error could not determine executable to run`. **Don't retry with `npx -y zapier-sdk`** — that installs and runs whatever that unrelated package is. Run `npm install --omit=dev` here first, then retry.

1. Check for an existing session first: `npx zapier-sdk get-profile`. If it succeeds, skip straight to [selecting or creating a connection](#selecting-or-creating-a-connection). The "Authentication required but no credentials available" message — here or from any later call — just means you need to (re-)log in.
2. Before your first `login` call, decide once: can this process launch a browser and receive its local OAuth callback? If not — remote (SSH/CI), containerized, or otherwise sandboxed — start with both together rather than discovering it through a failed attempt:

   ```bash
   TS_KEYRING_BACKEND=file npx zapier-sdk login --headless
   ```

   This prints a URL instead of opening a browser. Since you can't feed it interactive input mid-command, have the user open the URL and send back the final `localhost` redirect URL it lands on (that page fails to load — expected). Finish with `npx zapier-sdk login --callback-url "<pasted-url>"` (same prefix).

   An environment that can't launch a browser usually can't reach the OS keychain either. If unsure: no `$DISPLAY`/`$WAYLAND_DISPLAY` (Linux) means no browser; no `$DBUS_SESSION_BUS_ADDRESS` (Linux) means no keyring session — but trust what you know about your own harness over these, since a sandboxed process can lack both even on a machine that has them.

   **Not a one-time login flag** — every later command that resolves a `zapier:<connection-id>` connection reads the same keyring too, and can fail with `PermissionDenied` (or `Couldn't access platform storage`) even after login succeeded. If your harness runs each command in a fresh shell, `export` won't carry forward — set it inline per call: `TS_KEYRING_BACKEND=file node cli.js run <script> '<input-json>' --connection zapier:<connection-id>`.

3. Otherwise, run `npx zapier-sdk login --help` once to confirm available flags, then `npx zapier-sdk login`.

**Long-running or unattended deployment (not an interactive agent session)?** Client credentials are a better fit than login — set `ZAPIER_CREDENTIALS_CLIENT_ID` and `ZAPIER_CREDENTIALS_CLIENT_SECRET` and step 1's `get-profile` check picks them up automatically, no login needed. Mint them ahead of time with an existing session (`npx zapier-sdk create-client-credentials`) and set them here before you start — not something to bootstrap mid-session; for a typical agent session, log in as above instead.

## Selecting or creating a connection

Once logged in, list this app's connections:

```bash
npx zapier-sdk list-connections GoogleCalendarCLIAPI
```

Title and connection id are both in the default output — that's all these steps need. Add `--json` only if you need other fields programmatically (e.g. `is_expired`, `permissions`); if so, don't assume the full output is valid JSON as printed — an update-nag banner can print ahead of the JSON blob.

None yet (`No Connection items found.`)? `create-connection` mints the URL _and_ blocks polling for it, up to a 5-minute default timeout — avoid it here, since that ties up your whole turn with no way to tell the user anything in the meantime. Use its two lower-level primitives instead:

```bash
TS_KEYRING_BACKEND=file npx zapier-sdk get-connection-start-url GoogleCalendarCLIAPI
```

Share the printed URL with the user and end your turn there — don't block waiting. The completion page shows the new connection's id directly — ask the user to paste it back; that's simpler and more reliable than fetching it yourself.

If you do fetch it yourself, `wait-for-new-connection` needs a `<started-at>` argument its own error message doesn't explain — use the `ts=<value>` query parameter from the URL you printed above, unchanged:

```bash
TS_KEYRING_BACKEND=file npx zapier-sdk wait-for-new-connection GoogleCalendarCLIAPI <started-at>
```

This polls and blocks until the connection appears, returning `{ id, app, title }` — `id` is the connection id to pass as `zapier:<connection-id>` either way.

If more than one matches, list the titles and ask the user which to use. If a connection is shared (e.g. an org-wide connection), opt in explicitly — ask the user before retrying with:

```bash
npx zapier-sdk --can-include-shared-connections list-connections GoogleCalendarCLIAPI --include-shared
```

Pass the resulting connection id as `zapier:<connection-id>` — see the reference you loaded from [`SKILL.md`](../SKILL.md#setup) for the exact syntax in your shape.

## When this should change your recommendation

If the user is hitting friction one of the benefits above would solve, log them in via the steps above rather than working around it yourself.
