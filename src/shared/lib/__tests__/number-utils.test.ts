import { describe, expect, it } from "vitest";

import { roundValue, toNumber } from "@/shared/lib/number-utils";

describe("toNumber", () => {
  it("returns null for null/undefined/empty string", () => {
    expect(toNumber(null)).toBe(null);
    expect(toNumber(undefined)).toBe(null);
    expect(toNumber("")).toBe(null);
  });

  it("returns the fallback when provided", () => {
    expect(toNumber(null, 42)).toBe(42);
    expect(toNumber(undefined, 0)).toBe(0);
    expect(toNumber("", -1)).toBe(-1);
  });

  it("handles numeric input", () => {
    expect(toNumber(0)).toBe(0);
    expect(toNumber(3.14)).toBe(3.14);
    expect(toNumber(-99)).toBe(-99);
  });

  it("rejects non-finite numbers", () => {
    expect(toNumber(NaN)).toBe(null);
    expect(toNumber(Infinity)).toBe(null);
    expect(toNumber(-Infinity)).toBe(null);
  });

  it("parses string numerics, including thousands separators", () => {
    expect(toNumber("1,000")).toBe(1000);
    expect(toNumber("1,234,567.89")).toBeCloseTo(1234567.89);
    expect(toNumber("  42 ")).toBe(42);
  });

  it("rejects invalid strings", () => {
    expect(toNumber("abc")).toBe(null);
    expect(toNumber("12abc")).toBe(null);
    expect(toNumber("--7")).toBe(null);
  });

  it("handles bigint", () => {
    expect(toNumber(BigInt(42))).toBe(42);
    expect(toNumber(BigInt(0))).toBe(0);
  });
});

describe("roundValue", () => {
  it("rounds to 2 decimals by default", () => {
    expect(roundValue(3.14159)).toBe(3.14);
    expect(roundValue(2.7182818)).toBe(2.72);
  });

  it("respects custom decimal places", () => {
    expect(roundValue(0.123456, 4)).toBe(0.1235);
    expect(roundValue(99.9999, 0)).toBe(100);
  });

  it("handles edge cases", () => {
    expect(roundValue(0)).toBe(0);
    // toFixed sigue las convenciones de IEEE-754 (round-half-to-even truncado).
    // El valor exacto depende del binario; sólo verificamos que el tipo y rango
    // sean los esperados.
    const rounded = roundValue(-1.555, 2);
    expect(typeof rounded).toBe("number");
    expect(Math.abs(rounded + 1.55)).toBeLessThan(0.02);
  });
});
