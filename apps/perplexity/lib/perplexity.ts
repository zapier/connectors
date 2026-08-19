// Shared helpers for the Perplexity connector — used by createAgent, getAgentResponse, and search.

/**
 * Perplexity's date filters accept MM/DD/YYYY on the wire. Agents naturally produce
 * ISO YYYY-MM-DD, so accept that too and convert. Anything already MM/DD/YYYY (or an
 * unrecognized shape) is passed through unchanged for the API to validate.
 */
export function toApiDate(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  return value;
}

type WebSearchInput = {
  enable_web_search?: boolean;
  search_domain_filter?: string[];
  search_recency_filter?: string;
  search_after_date_filter?: string;
  search_before_date_filter?: string;
};

/**
 * Assemble the Agent API `tools` array from the connector's flat web-search inputs.
 * Web search is grounding — the whole point of Perplexity — so it is on by default and
 * only omitted when the caller passes enable_web_search: false.
 */
export function buildTools(
  input: WebSearchInput,
): Array<Record<string, unknown>> | undefined {
  if (input.enable_web_search === false) return undefined;

  const filters: Record<string, unknown> = {};
  if (input.search_domain_filter !== undefined)
    filters["search_domain_filter"] = input.search_domain_filter;
  if (input.search_recency_filter !== undefined)
    filters["search_recency_filter"] = input.search_recency_filter;
  const after = toApiDate(input.search_after_date_filter);
  if (after !== undefined) filters["search_after_date_filter"] = after;
  const before = toApiDate(input.search_before_date_filter);
  if (before !== undefined) filters["search_before_date_filter"] = before;

  const tool: Record<string, unknown> = { type: "web_search" };
  if (Object.keys(filters).length > 0) tool["filters"] = filters;
  return [tool];
}

type ContentPart = { type?: string; text?: string };
type OutputItem = {
  type?: string;
  content?: ContentPart[] | null;
  results?: Array<Record<string, unknown>> | null;
};
type AgentResponseLike = { output?: OutputItem[] | null };

export type DerivedSource = { title?: string; url?: string; snippet?: string };

/**
 * Walk an Agent API response's `output[]` and derive the two fields an agent actually
 * wants: the answer text (aggregated from the message item's `output_text` content
 * parts) and the grounding sources (from the `search_results` item). Both are empty on
 * a still-running background response.
 */
export function deriveAgentResult(data: AgentResponseLike): {
  answer: string;
  sources: DerivedSource[];
} {
  let answer = "";
  const sources: DerivedSource[] = [];
  for (const item of data.output ?? []) {
    if (item?.type === "message" && Array.isArray(item.content)) {
      for (const part of item.content) {
        if (part?.type === "output_text" && typeof part.text === "string") {
          answer += part.text;
        }
      }
    }
    if (item?.type === "search_results" && Array.isArray(item.results)) {
      for (const r of item.results) {
        sources.push({
          title:
            typeof r["title"] === "string" ? (r["title"] as string) : undefined,
          url: typeof r["url"] === "string" ? (r["url"] as string) : undefined,
          snippet:
            typeof r["snippet"] === "string"
              ? (r["snippet"] as string)
              : undefined,
        });
      }
    }
  }
  return { answer, sources };
}

/**
 * The Search API's `query` accepts a string or an array of strings. Agents pass one
 * newline-separated text field; split it so multiple non-empty lines become a batch
 * (a single line stays a plain string).
 */
export function splitQuery(query: string): string | string[] {
  const lines = query
    .split("\n")
    .map((q) => q.trim())
    .filter(Boolean);
  if (lines.length <= 1) return lines[0] ?? query;
  return lines;
}
