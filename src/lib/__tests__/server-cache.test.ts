import { describe, it, expect, beforeEach, vi } from "vitest";
import { cachedAsync } from "../server-cache";

beforeEach(() => {
  global.__atlasServerCache = undefined;
  global.__atlasServerCacheInFlight = undefined;
});

describe("cachedAsync", () => {
  it("returns cached value within TTL (loader runs once)", async () => {
    const loader = vi.fn().mockResolvedValue("hello");

    const a = await cachedAsync("k1", 5000, loader);
    const b = await cachedAsync("k1", 5000, loader);

    expect(a).toBe("hello");
    expect(b).toBe("hello");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("re-fetches after TTL expires", async () => {
    let counter = 0;
    const loader = vi.fn().mockImplementation(() => Promise.resolve(++counter));

    const a = await cachedAsync("k2", 10, loader);
    expect(a).toBe(1);

    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 20));

    const b = await cachedAsync("k2", 10, loader);
    expect(b).toBe(2);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent requests (loader runs once)", async () => {
    let resolveLoader: (v: string) => void;
    const loader = vi.fn().mockImplementation(
      () => new Promise<string>((r) => { resolveLoader = r; }),
    );

    const p1 = cachedAsync("k3", 5000, loader);
    const p2 = cachedAsync("k3", 5000, loader);

    resolveLoader!("deduped");

    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe("deduped");
    expect(b).toBe("deduped");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("evicts oldest entries when over MAX_CACHE_ENTRIES", async () => {
    // Fill cache to the limit (MAX_CACHE_ENTRIES = 200)
    for (let i = 0; i < 200; i++) {
      await cachedAsync(`fill-${i}`, 60_000, () => Promise.resolve(i));
    }

    expect(global.__atlasServerCache!.size).toBe(200);

    // Adding one more should evict the oldest
    await cachedAsync("overflow", 60_000, () => Promise.resolve("new"));

    expect(global.__atlasServerCache!.size).toBe(200);
    expect(global.__atlasServerCache!.has("fill-0")).toBe(false);
    expect(global.__atlasServerCache!.has("overflow")).toBe(true);
  });
});
