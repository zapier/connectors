/**
 * Shared helpers for the GitLab connector.
 *
 * The API base host is `gitlab.com`; scripts build `https://gitlab.com/api/v4/...`
 * URLs and the connection resolver rewrites the host in direct mode when
 * `GITLAB_HOST` targets a self-managed or Dedicated instance.
 */

/**
 * Parse GitLab's `x-next-page` response header into a `nextPage` cursor, or null
 * when the current page is the last. GitLab returns the next offset page in the
 * `x-next-page` header; an empty value means no more pages.
 */
export const nextPageFrom = (headers: Headers): number | null => {
  const raw = headers.get("x-next-page");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Wrap a GitLab list response (a bare JSON array + pagination headers) into the
 * `{ items, nextPage }` envelope every list tool's output schema declares.
 */
export const listResult = async (
  res: Response,
): Promise<{ items: unknown[]; nextPage: number | null }> => {
  const items = (await res.json()) as unknown[];
  return { items, nextPage: nextPageFrom(res.headers) };
};

/**
 * POST a GraphQL operation to GitLab's `/api/graphql` endpoint and return the
 * `data` payload, throwing on transport failures or top-level GraphQL errors.
 * Work items are GraphQL-only (the REST epics API is deprecated), so the
 * work-item tools build their query/mutation and call through here.
 */
export const gitlabGraphql = async (
  fetch: typeof globalThis.fetch,
  query: string,
  variables: Record<string, unknown>,
): Promise<unknown> => {
  const res = await fetch("https://gitlab.com/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as {
    data?: unknown;
    errors?: { message: string }[];
  };
  if (json.errors?.length) {
    throw new Error(
      `GitLab GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`,
    );
  }
  return json.data;
};
