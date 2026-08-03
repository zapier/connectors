import { describe, expect, it } from "vitest";

import {
  ensureAlgoliaOk,
  isAlgoliaReadRequest,
  relayAlgoliaFetch,
  rewriteAlgoliaHost,
} from "../lib/algolia.ts";

function jsonResponse(body: unknown, status: number): Response {
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers(),
    text: async () => JSON.stringify(body),
    clone() {
      return this;
    },
    json: async () => body,
  } as unknown as Response;
}

describe("isAlgoliaReadRequest", () => {
  it("treats GET as a read", () => {
    expect(isAlgoliaReadRequest("GET", "/1/indexes/x/settings")).toBe(true);
  });
  it("treats POST search/browse/lookup paths as reads", () => {
    for (const p of [
      "/1/indexes/x/query",
      "/1/indexes/*/queries",
      "/1/indexes/x/browse",
      "/1/indexes/*/objects",
      "/1/indexes/*/recommendations",
      "/1/indexes/x/synonyms/search",
      "/1/indexes/x/rules/search",
      "/1/indexes/x/facets/brand/query",
    ]) {
      expect(isAlgoliaReadRequest("POST", p)).toBe(true);
    }
  });
  it("treats POST write paths as writes", () => {
    for (const p of [
      "/1/indexes/x/batch",
      "/1/indexes/x/deleteByQuery",
      "/1/indexes/x/clear",
      "/1/indexes/x/operation",
    ]) {
      expect(isAlgoliaReadRequest("POST", p)).toBe(false);
    }
  });
});

describe("rewriteAlgoliaHost", () => {
  it("rewrites the placeholder host to the write host and injects headers", async () => {
    let seenUrl = "";
    let seenHeaders: Headers | undefined;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      seenUrl = url;
      seenHeaders = new Headers(init?.headers);
      return jsonResponse({ ok: true }, 200);
    }) as typeof globalThis.fetch;
    try {
      const f = rewriteAlgoliaHost("APP123", "secret-key");
      await f("https://application-id.algolia.net/1/indexes/products", {
        method: "POST",
      });
      expect(seenUrl).toBe("https://app123.algolia.net/1/indexes/products");
      expect(seenHeaders?.get("x-algolia-application-id")).toBe("APP123");
      expect(seenHeaders?.get("x-algolia-api-key")).toBe("secret-key");
    } finally {
      globalThis.fetch = orig;
    }
  });

  it("routes reads to the -dsn host", async () => {
    let seenUrl = "";
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      seenUrl = url;
      return jsonResponse({ ok: true }, 200);
    }) as typeof globalThis.fetch;
    try {
      const f = rewriteAlgoliaHost("APP123", "k");
      await f("https://application-id.algolia.net/1/indexes/products/query", {
        method: "POST",
      });
      expect(seenUrl).toBe(
        "https://app123-dsn.algolia.net/1/indexes/products/query",
      );
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe("relayAlgoliaFetch (Zapier-managed placeholders)", () => {
  it("rewrites a write to the {{application_id}} host + write-key placeholder header", async () => {
    let seenUrl = "";
    let seenHeaders: Headers | undefined;
    const relay = (async (url: string, init?: RequestInit) => {
      seenUrl = url;
      seenHeaders = new Headers(init?.headers);
      return jsonResponse({ ok: true }, 200);
    }) as typeof globalThis.fetch;
    const f = relayAlgoliaFetch(relay);
    await f("https://application-id.algolia.net/1/indexes/products", {
      method: "POST",
    });
    expect(seenUrl).toBe(
      "https://{{application_id}}.algolia.net/1/indexes/products",
    );
    expect(seenHeaders?.get("x-algolia-application-id")).toBe(
      "{{application_id}}",
    );
    expect(seenHeaders?.get("x-algolia-api-key")).toBe("{{write_api_key}}");
  });

  it("rewrites a read to the -dsn host + search-key placeholder header", async () => {
    let seenUrl = "";
    let seenHeaders: Headers | undefined;
    const relay = (async (url: string, init?: RequestInit) => {
      seenUrl = url;
      seenHeaders = new Headers(init?.headers);
      return jsonResponse({ ok: true }, 200);
    }) as typeof globalThis.fetch;
    const f = relayAlgoliaFetch(relay);
    await f("https://application-id.algolia.net/1/indexes/products/query", {
      method: "POST",
    });
    expect(seenUrl).toBe(
      "https://{{application_id}}-dsn.algolia.net/1/indexes/products/query",
    );
    expect(seenHeaders?.get("x-algolia-api-key")).toBe("{{search_api_key}}");
  });
});

describe("ensureAlgoliaOk", () => {
  it("is a no-op on 2xx", async () => {
    await expect(
      ensureAlgoliaOk(jsonResponse({}, 200), "x"),
    ).resolves.toBeUndefined();
  });
  it("maps 403 to an ACL message", async () => {
    await expect(
      ensureAlgoliaOk(jsonResponse({ message: "nope" }, 403), "saveObject"),
    ).rejects.toThrow(/ACL|permission|403/i);
  });
  it("maps 404 to not-found", async () => {
    await expect(
      ensureAlgoliaOk(jsonResponse({ message: "gone" }, 404), "getObject"),
    ).rejects.toThrow(/not found|404/i);
  });
  it("maps 429 to rate-limited", async () => {
    await expect(
      ensureAlgoliaOk(jsonResponse({}, 429), "batch"),
    ).rejects.toThrow(/rate limit|429/i);
  });
});
