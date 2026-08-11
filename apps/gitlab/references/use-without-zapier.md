# Using Gitlab with direct credentials

This is the direct-auth path: you hold and pass Gitlab's credential yourself, rather than routing it through a Zapier connection — see [`references/use-with-zapier.md`](use-with-zapier.md) for that path instead.

## Getting credentials

This connector authenticates with a GitLab **access token** sent as the `PRIVATE-TOKEN` header. A personal access token is the simplest to mint; project and group access tokens (bot identities scoped to one project or group) work identically and are preferable for automation you don't want tied to a person.

To create a **personal access token** (from GitLab's own docs):

1. In the upper-right corner, select your avatar.
2. Select **Edit profile**.
3. In the left sidebar, select **Access** > **Personal access tokens**.
4. From the **Generate token** dropdown list, select **Legacy token**.
5. In **Token name**, enter a name for the token.
6. Optional. In **Token description**, enter a description.
7. In **Expiration date**, enter an expiry date.
8. Select one or more scopes (see below).
9. Select **Generate token**.

The token is shown once — after you leave or refresh the page you cannot view it again, so copy it immediately.

**Scopes** — pick the minimum:

- **`api`** — complete read and write access to the API. Needed for any write (create/update/merge/commit/comment).
- **`read_api`** — read-only access. Enough for a read-only agent (the list/get/search/diff/log tools); a write with a `read_api`-only token fails `403`.

On a self-managed or GitLab Dedicated instance, mint the token on that instance and point the connector at it with `GITLAB_HOST`. See [`references/gitlab-api-gotchas.md`](gitlab-api-gotchas.md#scopes-api-vs-read_api) for scope behavior.

## Passing the credential

Pass it as a direct-token resolver in the `[<resolver>:]<value>` connection string — see [`SKILL.md`](../SKILL.md#auth) for the resolver model, and the reference you loaded from `SKILL.md`'s `## Setup` router for the exact syntax in your shape.

This connector's direct resolver is **`env:<VAR_NAME>`** — it reads the token from a named environment variable and sends it as the `PRIVATE-TOKEN` header. Set `GITLAB_TOKEN` and pass `env:GITLAB_TOKEN` (or a bare `env:<YOUR_VAR>` naming whichever variable holds the token). To target a self-managed or GitLab Dedicated instance instead of `gitlab.com`, also set `GITLAB_HOST` (the token is only ever sent to that host).

## Safely reading the credential from the user

Ask the user to set it as an environment variable out-of-band — their shell profile, a `.env` file, or their harness's secret store — rather than pasting the value inline. It never needs to appear in chat history or logs.

The same applies to checking whether it's already set: `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if it's set. Check names only — `env | cut -d= -f1 | grep -i <name>` — or, if you already know the exact variable name, test it directly: `[ -n "$VAR_NAME" ] && echo set`.
