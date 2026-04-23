import { describe, expect, it } from "vitest";

import {
  buildNodeHeadline,
  buildVisibleSummary,
  formatDisplayValue,
  getRatioTone,
} from "@/modules/postcosecha/lib/balanzas-node-format";
import type { BalanzasNodeData, BalanzasTableColumn, BalanzasTableRow } from "@/lib/postcosecha-balanzas";

function makeColumn(key: string, kind: BalanzasTableColumn["kind"]): BalanzasTableColumn {
  return { key, label: key, kind };
}

function makeRow(id: string, values: Record<string, string | number | null>): BalanzasTableRow {
  return { id, values, ratioPct: null, gapValue: null };
}

type ColMap = BalanzasNodeData["columnMap"];
const emptyColMap: ColMap = {
  source: null, target: null, date: null, ratio: "", gap: "",
  isoWeek: null, preWeek: null, year: null, dayName: null, month: null,
  destination: null, lot: null, grade: null, hydrationDays: null,
};

function makeNode(overrides: Partial<Pick<BalanzasNodeData, "metric" | "columnMap" | "label" | "laneLabel" | "key" | "kind">> = {}): BalanzasNodeData {
  return {
    metric: "tallos",
    columnMap: emptyColMap,
    label: "B2 Pre GV",
    laneLabel: "Preclasificacion / GV sin pelar",
    key: "b2_pre_gv",
    kind: "metric",
    ...overrides,
  } as unknown as BalanzasNodeData;
}

// ─── formatDisplayValue ───────────────────────────────────────────────────────

describe("formatDisplayValue", () => {
  it("returns '-' for null value", () => {
    const node = makeNode();
    const col = makeColumn("val", "text");
    expect(formatDisplayValue(node, col, makeRow("r1", { val: null }))).toBe("-");
  });

  it("returns '-' for undefined value", () => {
    const node = makeNode();
    const col = makeColumn("val", "text");
    expect(formatDisplayValue(node, col, makeRow("r1", {}))).toBe("-");
  });

  it("returns '-' for empty string value", () => {
    const node = makeNode();
    const col = makeColumn("val", "text");
    expect(formatDisplayValue(node, col, makeRow("r1", { val: "" }))).toBe("-");
  });

  it("formats ratio column as percent with 1 decimal", () => {
    const node = makeNode();
    const col = makeColumn("pct", "ratio");
    const result = formatDisplayValue(node, col, makeRow("r1", { pct: 95.5 }));
    expect(result).toContain("95");
    expect(result).toContain("%");
  });

  it("formats integer number without decimals", () => {
    const node = makeNode();
    const col = makeColumn("count", "number");
    const result = formatDisplayValue(node, col, makeRow("r1", { count: 1500 }));
    expect(result).toContain("1");
    expect(result).toContain("500");
  });

  it("appends kg for peso metric on source column", () => {
    const node = makeNode({
      metric: "peso" as BalanzasNodeData["metric"],
      columnMap: { ...emptyColMap, source: "src" },
    });
    const col = makeColumn("src", "number");
    const result = formatDisplayValue(node, col, makeRow("r1", { src: 250 }));
    expect(result).toContain("kg");
  });

  it("does NOT append kg for tallos metric", () => {
    const node = makeNode({
      metric: "tallos",
      columnMap: { ...emptyColMap, source: "src" },
    });
    const col = makeColumn("src", "number");
    const result = formatDisplayValue(node, col, makeRow("r1", { src: 250 }));
    expect(result).not.toContain("kg");
  });

  it("returns string directly for text values", () => {
    const node = makeNode();
    const col = makeColumn("name", "text");
    expect(formatDisplayValue(node, col, makeRow("r1", { name: "Arcoiris" }))).toBe("Arcoiris");
  });

  it("returns string representation for non-finite ratio", () => {
    const node = makeNode();
    const col = makeColumn("pct", "ratio");
    const result = formatDisplayValue(node, col, makeRow("r1", { pct: Number.NaN }));
    expect(result).toBe("NaN");
  });
});

// ─── getRatioTone ─────────────────────────────────────────────────────────────

describe("getRatioTone", () => {
  it("returns bg-background class for null", () => {
    expect(getRatioTone(null)).toContain("bg-background");
  });

  it("returns success class for exactly 95", () => {
    expect(getRatioTone(95)).toContain("bg-chart-success-bold");
  });

  it("returns success class for value above 95", () => {
    expect(getRatioTone(100)).toContain("bg-chart-success-bold");
    expect(getRatioTone(97.5)).toContain("bg-chart-success-bold");
  });

  it("returns slate class for 80", () => {
    expect(getRatioTone(80)).toContain("bg-slate-500");
  });

  it("returns slate class for value between 80 and 94.9", () => {
    expect(getRatioTone(94.9)).toContain("bg-slate-500");
    expect(getRatioTone(85)).toContain("bg-slate-500");
  });

  it("returns slate class for value below 80", () => {
    expect(getRatioTone(0)).toContain("bg-slate-500");
    expect(getRatioTone(79.9)).toContain("bg-slate-500");
  });
});

// ─── buildVisibleSummary ──────────────────────────────────────────────────────

describe("buildVisibleSummary", () => {
  it("returns zero totals and null ratioPct for empty rows", () => {
    const node = makeNode({ columnMap: { ...emptyColMap, source: "src", target: "tgt" } });
    const result = buildVisibleSummary(node, []);
    expect(result.sourceTotal).toBe(0);
    expect(result.targetTotal).toBe(0);
    expect(result.gapTotal).toBe(0);
    expect(result.ratioPct).toBeNull();
  });

  it("sums source and target across multiple rows", () => {
    const node = makeNode({ columnMap: { ...emptyColMap, source: "src", target: "tgt" } });
    const rows = [
      makeRow("r1", { src: 100, tgt: 90 }),
      makeRow("r2", { src: 200, tgt: 180 }),
    ];
    const result = buildVisibleSummary(node, rows);
    expect(result.sourceTotal).toBe(300);
    expect(result.targetTotal).toBe(270);
    expect(result.gapTotal).toBe(30);
  });

  it("returns null ratioPct when sourceTotal is zero", () => {
    const node = makeNode({ columnMap: { ...emptyColMap, source: "src", target: "tgt" } });
    const result = buildVisibleSummary(node, [makeRow("r1", { src: 0, tgt: 0 })]);
    expect(result.ratioPct).toBeNull();
  });

  it("calculates ratioPct as (target/source - 1) * 100", () => {
    const node = makeNode({ columnMap: { ...emptyColMap, source: "src", target: "tgt" } });
    const rows = [makeRow("r1", { src: 100, tgt: 90 })];
    const result = buildVisibleSummary(node, rows);
    expect(result.ratioPct).toBeCloseTo(-10, 5);
  });

  it("picks the latest date string across rows", () => {
    const node = makeNode({ columnMap: { ...emptyColMap, date: "fecha" } });
    const rows = [
      makeRow("r1", { fecha: "2024-01-01" }),
      makeRow("r2", { fecha: "2024-03-15" }),
      makeRow("r3", { fecha: "2024-02-10" }),
    ];
    const result = buildVisibleSummary(node, rows);
    expect(result.latestDate).toBe("2024-03-15");
  });

  it("skips source/target calculation when columnMap has no source", () => {
    const node = makeNode({ columnMap: { ...emptyColMap, source: null, target: null } });
    const rows = [makeRow("r1", { src: 100, tgt: 80 })];
    const result = buildVisibleSummary(node, rows);
    expect(result.sourceTotal).toBe(0);
    expect(result.targetTotal).toBe(0);
  });
});

// ─── buildNodeHeadline ────────────────────────────────────────────────────────

describe("buildNodeHeadline", () => {
  it("concatenates label and laneLabel with a separator", () => {
    const node = makeNode({ label: "B2 Pre GV", laneLabel: "GV sin pelar" });
    expect(buildNodeHeadline(node)).toBe("B2 Pre GV | GV sin pelar");
  });
});
