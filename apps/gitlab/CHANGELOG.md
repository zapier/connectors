# @zapier/gitlab-connector

## 0.1.0

### Minor Changes

- 85a3357: Initial public release of the GitLab connector — 47 agent-callable tools (43 REST +
  4 GraphQL Work Items) covering the merge-request review loop, repository authoring,
  issues and work items, CI/pipelines, and search. Dual auth: long-lived PRIVATE-TOKEN
  (direct) and Zapier-managed OAuth via Relay, with a configurable GITLAB_HOST override.
  This is the publish-prep bump (0.0.0 → 0.1.0) deferred from the Phase-2 implementation
  MR; the release is gated on the one-time npm OIDC trust bootstrap.
