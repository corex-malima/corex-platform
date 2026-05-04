import { describe, expect, it } from "vitest";

import {
  decodeMultiSelectValue,
  encodeMultiSelectValue,
  hasMultiSelectValue,
  matchesMultiSelectValue,
  summarizeMultiSelectValue,
} from "@/lib/multi-select";

describe("decodeMultiSelectValue", () => {
  it("returns empty array for null/undefined/'all'", () => {
    expect(decodeMultiSelectValue(null)).toEqual([]);
    expect(decodeMultiSelectValue(undefined)).toEqual([]);
    expect(decodeMultiSelectValue("all")).toEqual([]);
    expect(decodeMultiSelectValue("")).toEqual([]);
  });

  it("splits by comma, trims, dedupes, drops empty", () => {
    expect(decodeMultiSelectValue("a,b,c")).toEqual(["a", "b", "c"]);
    expect(decodeMultiSelectValue(" a , b ,, c ,a ")).toEqual(["a", "b", "c"]);
  });
});

describe("encodeMultiSelectValue", () => {
  it("joins values with comma", () => {
    expect(encodeMultiSelectValue(["a", "b", "c"])).toBe("a,b,c");
  });

  it("returns 'all' for empty", () => {
    expect(encodeMultiSelectValue([])).toBe("all");
    expect(encodeMultiSelectValue([""])).toBe("all");
  });

  it("dedupes and trims", () => {
    expect(encodeMultiSelectValue(["a", " a ", "b"])).toBe("a,b");
  });
});

describe("hasMultiSelectValue", () => {
  it("detects active selections", () => {
    expect(hasMultiSelectValue("a")).toBe(true);
    expect(hasMultiSelectValue("a,b")).toBe(true);
  });

  it("treats 'all'/empty/null as inactive", () => {
    expect(hasMultiSelectValue("all")).toBe(false);
    expect(hasMultiSelectValue("")).toBe(false);
    expect(hasMultiSelectValue(null)).toBe(false);
  });
});

describe("matchesMultiSelectValue", () => {
  it("returns true when selection is empty (all match)", () => {
    expect(matchesMultiSelectValue("all", "x")).toBe(true);
    expect(matchesMultiSelectValue(null, "x")).toBe(true);
  });

  it("matches candidate against selection", () => {
    expect(matchesMultiSelectValue("a,b", "a")).toBe(true);
    expect(matchesMultiSelectValue("a,b", "c")).toBe(false);
  });

  it("trims candidate before comparing", () => {
    expect(matchesMultiSelectValue("a,b", " a ")).toBe(true);
  });

  it("normalizes nullish candidate to empty string", () => {
    expect(matchesMultiSelectValue("a,b", null)).toBe(false);
    expect(matchesMultiSelectValue("a,b", undefined)).toBe(false);
  });
});

describe("summarizeMultiSelectValue", () => {
  it("returns emptyLabel for empty selection", () => {
    expect(summarizeMultiSelectValue("all")).toBe("Todos");
    expect(summarizeMultiSelectValue(null, "Sin seleccionar")).toBe("Sin seleccionar");
  });

  it("returns single value when length=1", () => {
    expect(summarizeMultiSelectValue("xle")).toBe("xle");
  });

  it("appends count for multiple", () => {
    expect(summarizeMultiSelectValue("a,b,c")).toBe("a +2");
    expect(summarizeMultiSelectValue("a,b")).toBe("a +1");
  });
});
