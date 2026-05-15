import { z } from "zod";
import { defineTool, runCli } from "@zapier/skills";

/**
 * Canonical *multi-connection* example: copy a Notion page from one
 * workspace ("source") to another ("target"). Both slots use the
 * `"notion"` Zapier-appKey shorthand — each slot resolves to its own
 * authed Fetch independently, so the same script handles migration
 * between two distinct Notion accounts.
 *
 * Env contract (CLI):
 *   SOURCE_NOTION_TOKEN=...  (or SOURCE_NOTION_ZAPIER_CONNECTION_ID=...)
 *   TARGET_NOTION_TOKEN=...  (or TARGET_NOTION_ZAPIER_CONNECTION_ID=...)
 *
 * Programmatic:
 *   await copyPage(input, {
 *     connections: {
 *       source: { NOTION_TOKEN: "..." },
 *       target: { NOTION_TOKEN: "..." },
 *     },
 *   });
 *
 * Author surface: `run` receives a `ctx` with per-slot fetches —
 * `ctx.fetches.source` reads the original page, `ctx.fetches.target` creates
 * the copy. No threading of separate Fetch arguments through the script
 * body, no per-call auth logic, no env-var plumbing in the script itself —
 * all of that is handled by the framework and surfaces via `ctx`.
 */
const script = defineTool({
  name: "copy_page",
  title: "Copy a Notion page between workspaces",
  description:
    "Copy a Notion page (top-level properties only — block children are not recursed) from the `source` workspace to the `target` workspace under a chosen parent page. Returns the new page's id and url.",
  inputSchema: z.object({
    sourcePageId: z
      .string()
      .describe(
        "UUID of the page to copy from the source workspace. Use the `search` tool against the source workspace to find a page by name.",
      ),
    targetParentPageId: z
      .string()
      .describe(
        "UUID of the page in the target workspace to create the copy under. Notion requires every page to have either a page or database parent.",
      ),
  }),
  outputSchema: z.object({
    object: z.literal("page"),
    id: z.string(),
    url: z.string(),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  statements: [
    {
      effect: "ask",
      permissions: ["can_execute"],
      resources: ["http"],
      conditions: [
        {
          path: ["url"],
          operator: "matches_url",
          value: "https://api.notion.com/v1/*",
        },
      ],
      label: "Copy a Notion page across workspaces",
    },
  ],
  connections: {
    source: { securityScheme: "notion" },
    target: { securityScheme: "notion" },
  },
  run: async (ctx, input) => {
    const readRes = await ctx.fetches.source(
      `https://api.notion.com/v1/pages/${input.sourcePageId}`,
      {
        method: "GET",
        headers: { "Notion-Version": "2022-06-28" },
      },
    );
    if (!readRes.ok) {
      const errBody = await readRes.text();
      throw new Error(
        `Notion copy_page (source) ${readRes.status}: ${errBody}`,
      );
    }
    const sourcePage = (await readRes.json()) as {
      properties: Record<string, unknown>;
    };

    const createRes = await ctx.fetches.target(
      "https://api.notion.com/v1/pages",
      {
        method: "POST",
        headers: {
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parent: { type: "page_id", page_id: input.targetParentPageId },
          properties: sourcePage.properties,
        }),
      },
    );
    if (!createRes.ok) {
      const errBody = await createRes.text();
      throw new Error(
        `Notion copy_page (target) ${createRes.status}: ${errBody}`,
      );
    }
    return createRes.json() as Promise<{
      object: "page";
      id: string;
      url: string;
    }>;
  },
});

export default script;

await runCli(import.meta, script);
