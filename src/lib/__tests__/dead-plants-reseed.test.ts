import { describe, expect, it } from "vitest";

import {
  assertValidWorkDate,
  getBedPosition,
  isDeadPlantsReseedType,
  normalizeCaptureCount,
  normalizeDeadPlantsReseedType,
} from "@/lib/dead-plants-reseed";

describe("dead plants / reseed domain helpers", () => {
  it("extracts the visible bed position from real bed ids", () => {
    expect(getBedPosition("1-1A-10")).toBe("10");
    expect(getBedPosition("12A-12A-3")).toBe("3");
    expect(getBedPosition("sin-guion")).toBe("guion");
  });

  it("normalizes supported record types", () => {
    expect(isDeadPlantsReseedType("dead")).toBe(true);
    expect(isDeadPlantsReseedType("reseed")).toBe(true);
    expect(isDeadPlantsReseedType("other")).toBe(false);
    expect(normalizeDeadPlantsReseedType("reseed")).toBe("reseed");
    expect(normalizeDeadPlantsReseedType("other")).toBe("dead");
  });

  it("allows only non-negative integer counts", () => {
    expect(normalizeCaptureCount(0)).toBe(0);
    expect(normalizeCaptureCount("12")).toBe(12);
    expect(() => normalizeCaptureCount(-1)).toThrow();
    expect(() => normalizeCaptureCount(1.5)).toThrow();
    expect(() => normalizeCaptureCount("x")).toThrow();
  });

  it("rejects invalid and future work dates", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayYmd = yesterday.toISOString().slice(0, 10);

    expect(() => assertValidWorkDate(yesterdayYmd)).not.toThrow();
    expect(() => assertValidWorkDate("17/04/2026")).toThrow();
    expect(() => assertValidWorkDate("2999-01-01")).toThrow();
  });
});
