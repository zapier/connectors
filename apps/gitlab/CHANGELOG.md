# @zapier/gitlab-connector

## 0.1.4

### Patch Changes

- 9792330: Synced with the updated Zapier platform tooling and policy (`connectors-dev validate --fix`):

  - `SKILL.md`

- 9792330: Automated dependency update from Renovate.

  - File changes as a result of (external) dependency updates.

## 0.1.3

### Patch Changes

- 1e274f3: Synced with the updated Zapier platform tooling and policy (`connectors-dev validate --fix`):

  - `README.md`
  - `references/use-as-cli.md`

- 1e274f3: Automated dependency update from Renovate.

  - `@zapier/connectors-sdk`: ^0.4.5 → ^0.4.6
  - File changes as a result of (external) dependency updates.

- 1e274f3: Synced with the updated Zapier platform tooling and policy (`connectors-dev validate --fix`):

  - `README.md`
  - `references/use-as-cli.md`

## 0.1.2

### Patch Changes

- 58e2e06: Synced with the updated Zapier platform tooling and policy (`connectors-dev validate --fix`):

  - `README.md`
  - `SKILL.md`
  - `references/use-without-zapier.md`

- 58e2e06: Automated dependency update from Renovate.

  - File changes as a result of (external) dependency updates.

## 0.1.1

### Patch Changes

- 6c9eb50: Automated dependency update from Renovate.

  - `@zapier/connectors-sdk`: ^0.4.3 → ^0.4.5

## 0.1.0

### Minor Changes

- 85a3357: Initial public release of the GitLab connector — 47 agent-callable tools (43 REST +
  4 GraphQL Work Items) covering the merge-request review loop, repository authoring,
  issues and work items, CI/pipelines, and search. Dual auth: long-lived PRIVATE-TOKEN
  (direct) and Zapier-managed OAuth via Relay, with a configurable GITLAB_HOST override.
  This is the publish-prep bump (0.0.0 → 0.1.0) deferred from the Phase-2 implementation
  MR; the release is gated on the one-time npm OIDC trust bootstrap.
