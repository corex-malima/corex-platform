import { describe, expect, it } from "vitest";

import type { BalanzasDetailColumn } from "@/lib/postcosecha-balanzas";
import {
  aggregateBalanzasMetrics,
  buildBalanzasLeafMetrics,
  formatBalanzasTableMetric,
  formatBalanzasTextValue,
} from "@/modules/postcosecha/components/balanzas-table-metrics";

const B1_B1C_WEIGHT_COLUMNS: BalanzasDetailColumn[] = [
  {
    key: "weight_b1_kg",
    label: "Peso B1 (kg)",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "weight_b1c_kg",
    label: "Peso B1C (kg)",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "weight_diff_pct",
    label: "Diferencia peso %",
    numeric: true,
    format: "pct",
    aggregateMode: "derived-ratio",
    aggregateSources: {
      numeratorKey: "weight_b1c_kg",
      denominatorKey: "weight_b1_kg",
    },
  },
];

const B1C_B2_WEIGHT_COLUMNS: BalanzasDetailColumn[] = [
  {
    key: "weight_per_stem_kg",
    label: "Peso / Tallo",
    numeric: true,
    format: "g",
    aggregateMode: "sum",
  },
  {
    key: "weight_b2_kg",
    label: "Peso_B2",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "weight_b1c_estimated_kg",
    label: "Peso_B1c",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "hydration_pct",
    label: "%HIDR",
    numeric: true,
    format: "pct",
    aggregateMode: "derived-ratio",
    aggregateSources: {
      numeratorKey: "weight_b2_kg",
      denominatorKey: "weight_b1c_estimated_kg",
    },
  },
];

const B2_B2A_WEIGHT_COLUMNS: BalanzasDetailColumn[] = [
  {
    key: "weight_b2_kg",
    label: "Peso_B2",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "weight_b2a_kg",
    label: "Peso_B2A",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "dispatch_pct",
    label: "%Desp_Peso",
    numeric: true,
    format: "pct",
    aggregateMode: "derived-ratio",
    aggregateSources: {
      numeratorKey: "weight_b2a_kg",
      denominatorKey: "weight_b2_kg",
    },
  },
];

const B1C_B2A_IDEAL_COLUMNS: BalanzasDetailColumn[] = [
  {
    key: "weight_b1c_kg",
    label: "Peso_B1C",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "weight_b2_kg",
    label: "Peso_B2",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "hydration_pct",
    label: "HIDR%",
    numeric: true,
    format: "pct",
    aggregateMode: "derived-ratio",
    aggregateSources: {
      numeratorKey: "weight_b2_kg",
      denominatorKey: "weight_b1c_kg",
    },
  },
  {
    key: "weight_b2a_kg",
    label: "Peso_B2A",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "dispatch_pct",
    label: "Desp%",
    numeric: true,
    format: "pct",
    aggregateMode: "derived-ratio",
    aggregateSources: {
      numeratorKey: "weight_b2a_kg",
      denominatorKey: "weight_b2_kg",
    },
  },
  {
    key: "ideal_weight_kg",
    label: "Peso_Ideal",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "b2a_to_ideal_ratio",
    label: "Dif_Peso%",
    numeric: true,
    format: "pct",
    aggregateMode: "derived-quotient",
    aggregateSources: {
      numeratorKey: "weight_b2a_kg",
      denominatorKey: "ideal_weight_kg",
    },
  },
  {
    key: "b2a_to_b1c_ratio",
    label: "Aprovechamiento %_1cvs2A",
    numeric: true,
    format: "pct",
    aggregateMode: "derived-quotient",
    aggregateSources: {
      numeratorKey: "weight_b2a_kg",
      denominatorKey: "weight_b1c_kg",
    },
  },
  {
    key: "ideal_to_b1c_ratio",
    label: "Aprovechamiento %_1cvsPesoIdeal",
    numeric: true,
    format: "pct",
    aggregateMode: "derived-quotient",
    aggregateSources: {
      numeratorKey: "ideal_weight_kg",
      denominatorKey: "weight_b1c_kg",
    },
  },
];

const PRECLASIF_B1A_B2_WEIGHT_COLUMNS: BalanzasDetailColumn[] = [
  {
    key: "weight_per_stem_b1ab",
    label: "Peso / Tallo",
    numeric: true,
    format: "g",
    aggregateMode: "sum",
  },
  {
    key: "weight_b1ab_est",
    label: "Peso_B1A",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "weight_b2",
    label: "Peso_B2",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "hydration_pct",
    label: "HIDR%",
    numeric: true,
    format: "pct",
    aggregateMode: "derived-ratio",
    aggregateSources: {
      numeratorKey: "weight_b2",
      denominatorKey: "weight_b1ab_est",
    },
  },
];

const PRECLASIF_B1_B3_IDEAL_COLUMNS: BalanzasDetailColumn[] = [
  {
    key: "weight_b1_kg",
    label: "Peso_B1",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "weight_b1ab_kg",
    label: "Peso_B1A",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "dispatch_1_pct",
    label: "Desp%",
    numeric: true,
    format: "pct",
    aggregateMode: "derived-ratio",
    aggregateSources: {
      numeratorKey: "weight_b1ab_kg",
      denominatorKey: "weight_b1_kg",
    },
  },
  {
    key: "weight_b2_kg",
    label: "Peso_B2",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "hydration_pct",
    label: "HIDR%",
    numeric: true,
    format: "pct",
    aggregateMode: "derived-ratio",
    aggregateSources: {
      numeratorKey: "weight_b2_kg",
      denominatorKey: "weight_b1ab_kg",
    },
  },
  {
    key: "weight_b3_kg",
    label: "Peso_B3",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "dispatch_2_pct",
    label: "Desp2%",
    numeric: true,
    format: "pct",
    aggregateMode: "derived-ratio",
    aggregateSources: {
      numeratorKey: "weight_b3_kg",
      denominatorKey: "weight_b2_kg",
    },
  },
  {
    key: "weight_ideal_kg",
    label: "Peso_Ideal",
    numeric: true,
    format: "kg",
    aggregateMode: "sum",
  },
  {
    key: "yield_b1_vs_b3",
    label: "Aprovechamiento_B1VSB3",
    numeric: true,
    format: "pct",
    aggregateMode: "derived-quotient",
    aggregateSources: {
      numeratorKey: "weight_b3_kg",
      denominatorKey: "weight_b1_kg",
    },
  },
  {
    key: "yield_b1_vs_ideal",
    label: "Aprovechamiento_B1 VS PESO",
    numeric: true,
    format: "pct",
    aggregateMode: "derived-quotient",
    aggregateSources: {
      numeratorKey: "weight_ideal_kg",
      denominatorKey: "weight_b1_kg",
    },
  },
];

describe("balanzas table metrics", () => {
  it("formats leaf weight difference as a percentage", () => {
    const metrics = buildBalanzasLeafMetrics(
      {
        weight_b1_kg: 100,
        weight_b1c_kg: 108,
        weight_diff_pct: 0.08,
      },
      B1_B1C_WEIGHT_COLUMNS,
    );

    expect(formatBalanzasTableMetric(metrics.weight_diff_pct, B1_B1C_WEIGHT_COLUMNS[2]!)).toMatch(/8,00\s?%/);
  });

  it("recalculates weekly subtotal as B1C / B1 - 1 instead of summing percentage rows", () => {
    const metrics = aggregateBalanzasMetrics(
      [
        { weight_b1_kg: 100, weight_b1c_kg: 108, weight_diff_pct: 0.08 },
        { weight_b1_kg: 200, weight_b1c_kg: 210, weight_diff_pct: 0.05 },
      ],
      B1_B1C_WEIGHT_COLUMNS,
    );

    expect(metrics.weight_b1_kg).toBe(300);
    expect(metrics.weight_b1c_kg).toBe(318);
    expect(metrics.weight_diff_pct).toBeCloseTo(0.06, 8);
    expect(formatBalanzasTableMetric(metrics.weight_diff_pct, B1_B1C_WEIGHT_COLUMNS[2]!)).toMatch(/6,00\s?%/);
  });

  it("returns the table empty state when the derived subtotal denominator is zero or missing", () => {
    const zeroDenominatorMetrics = aggregateBalanzasMetrics(
      [{ weight_b1_kg: 0, weight_b1c_kg: 50, weight_diff_pct: 0.5 }],
      B1_B1C_WEIGHT_COLUMNS,
    );
    const missingDenominatorMetrics = aggregateBalanzasMetrics(
      [{ weight_b1_kg: null, weight_b1c_kg: 50, weight_diff_pct: 0.5 }],
      B1_B1C_WEIGHT_COLUMNS,
    );

    expect(zeroDenominatorMetrics.weight_diff_pct).toBeNull();
    expect(missingDenominatorMetrics.weight_diff_pct).toBeNull();
    expect(formatBalanzasTableMetric(zeroDenominatorMetrics.weight_diff_pct, B1_B1C_WEIGHT_COLUMNS[2]!)).toBe("—");
    expect(formatBalanzasTableMetric(missingDenominatorMetrics.weight_diff_pct, B1_B1C_WEIGHT_COLUMNS[2]!)).toBe("—");
  });

  it("keeps weight columns summed and formatted as numeric kg values without changing the table style", () => {
    const metrics = aggregateBalanzasMetrics(
      [
        { weight_b1_kg: 125.5, weight_b1c_kg: 130.25, weight_diff_pct: 0.0378 },
        { weight_b1_kg: 74.5, weight_b1c_kg: 81.25, weight_diff_pct: 0.0906 },
      ],
      B1_B1C_WEIGHT_COLUMNS,
    );

    expect(metrics.weight_b1_kg).toBe(200);
    expect(metrics.weight_b1c_kg).toBe(211.5);
    expect(formatBalanzasTableMetric(metrics.weight_b1_kg, B1_B1C_WEIGHT_COLUMNS[0]!)).toBe("200");
    expect(formatBalanzasTableMetric(metrics.weight_b1c_kg, B1_B1C_WEIGHT_COLUMNS[1]!)).toBe("211,5");
  });

  it("applies the same percentage treatment to B1C vs B2 hydration based on B2 / B1C - 1", () => {
    const metrics = aggregateBalanzasMetrics(
      [
        { weight_b2_kg: 150, weight_b1c_estimated_kg: 100, hydration_pct: 0.4 },
        { weight_b2_kg: 84, weight_b1c_estimated_kg: 60, hydration_pct: 0.5 },
      ],
      B1C_B2_WEIGHT_COLUMNS,
    );

    expect(metrics.weight_b2_kg).toBe(234);
    expect(metrics.weight_b1c_estimated_kg).toBe(160);
    expect(metrics.hydration_pct).toBeCloseTo(0.4625, 8);
    expect(formatBalanzasTableMetric(metrics.hydration_pct, B1C_B2_WEIGHT_COLUMNS[3]!)).toMatch(/46,25\s?%/);
  });

  it("renders B1C vs B2 stem weight in grams for leaf values", () => {
    expect(formatBalanzasTableMetric(0.04, B1C_B2_WEIGHT_COLUMNS[0]!)).toBe("40");
    expect(formatBalanzasTableMetric(0.0375, B1C_B2_WEIGHT_COLUMNS[0]!)).toBe("37,5");
  });

  it("renders Preclasificación B1A vs B2 stem weight in grams for leaf values", () => {
    expect(formatBalanzasTableMetric(0.0469, PRECLASIF_B1A_B2_WEIGHT_COLUMNS[0]!)).toBe("46,9");
  });

  it("applies the same percentage treatment to B2 vs B2A dispatch based on B2A / B2 - 1", () => {
    const metrics = aggregateBalanzasMetrics(
      [
        { weight_b2_kg: 120, weight_b2a_kg: 150, dispatch_pct: 0.25 },
        { weight_b2_kg: 80, weight_b2a_kg: 92, dispatch_pct: 0.15 },
      ],
      B2_B2A_WEIGHT_COLUMNS,
    );

    expect(metrics.weight_b2_kg).toBe(200);
    expect(metrics.weight_b2a_kg).toBe(242);
    expect(metrics.dispatch_pct).toBeCloseTo(0.21, 8);
    expect(formatBalanzasTableMetric(metrics.dispatch_pct, B2_B2A_WEIGHT_COLUMNS[2]!)).toMatch(/21,00\s?%/);
  });

  it("formats flat-table numeric strings using the configured numeric columns", () => {
    expect(formatBalanzasTableMetric("218.27500000000003", B2_B2A_WEIGHT_COLUMNS[1]!)).toBe("218,28");
    expect(formatBalanzasTableMetric("-0.2921823121038334", B2_B2A_WEIGHT_COLUMNS[2]!)).toMatch(/-29,22\s?%/);
  });

  it("aggregates B1C vs B2A vs Ideal KPIs using Excel-style subtotal formulas", () => {
    const metrics = aggregateBalanzasMetrics(
      [
        {
          weight_b1c_kg: 100,
          weight_b2_kg: 108,
          hydration_pct: 0.08,
          weight_b2a_kg: 104,
          dispatch_pct: -0.037037,
          ideal_weight_kg: 98,
          b2a_to_ideal_ratio: 1.061224,
          b2a_to_b1c_ratio: 1.04,
          ideal_to_b1c_ratio: 0.98,
        },
        {
          weight_b1c_kg: 200,
          weight_b2_kg: 210,
          hydration_pct: 0.05,
          weight_b2a_kg: 180,
          dispatch_pct: -0.142857,
          ideal_weight_kg: 170,
          b2a_to_ideal_ratio: 1.058824,
          b2a_to_b1c_ratio: 0.9,
          ideal_to_b1c_ratio: 0.85,
        },
      ],
      B1C_B2A_IDEAL_COLUMNS,
    );

    expect(metrics.weight_b1c_kg).toBe(300);
    expect(metrics.weight_b2_kg).toBe(318);
    expect(metrics.hydration_pct).toBeCloseTo(0.06, 8);
    expect(metrics.weight_b2a_kg).toBe(284);
    expect(metrics.dispatch_pct).toBeCloseTo(-0.10691823899, 8);
    expect(metrics.ideal_weight_kg).toBe(268);
    expect(metrics.b2a_to_ideal_ratio).toBeCloseTo(1.0597014925, 8);
    expect(metrics.b2a_to_b1c_ratio).toBeCloseTo(0.9466666667, 8);
    expect(metrics.ideal_to_b1c_ratio).toBeCloseTo(0.8933333333, 8);
    expect(formatBalanzasTableMetric(metrics.hydration_pct, B1C_B2A_IDEAL_COLUMNS[2]!)).toMatch(/6,00\s?%/);
    expect(formatBalanzasTableMetric(metrics.dispatch_pct, B1C_B2A_IDEAL_COLUMNS[4]!)).toMatch(/-10,69\s?%/);
    expect(formatBalanzasTableMetric(metrics.b2a_to_ideal_ratio, B1C_B2A_IDEAL_COLUMNS[6]!)).toMatch(/105,97\s?%/);
    expect(formatBalanzasTableMetric(metrics.b2a_to_b1c_ratio, B1C_B2A_IDEAL_COLUMNS[7]!)).toMatch(/94,67\s?%/);
    expect(formatBalanzasTableMetric(metrics.ideal_to_b1c_ratio, B1C_B2A_IDEAL_COLUMNS[8]!)).toMatch(/89,33\s?%/);
  });

  it("aggregates Preclasificación B1 vs B3 ideal KPIs with derived subtotal formulas", () => {
    const metrics = aggregateBalanzasMetrics(
      [
        {
          weight_b1_kg: 100,
          weight_b1ab_kg: 75,
          dispatch_1_pct: -0.25,
          weight_b2_kg: 110,
          hydration_pct: 0.466667,
          weight_b3_kg: 95,
          dispatch_2_pct: -0.136364,
          weight_ideal_kg: 92,
          yield_b1_vs_b3: 0.95,
          yield_b1_vs_ideal: 0.92,
        },
        {
          weight_b1_kg: 200,
          weight_b1ab_kg: 150,
          dispatch_1_pct: -0.25,
          weight_b2_kg: 225,
          hydration_pct: 0.5,
          weight_b3_kg: 192,
          dispatch_2_pct: -0.146667,
          weight_ideal_kg: 186,
          yield_b1_vs_b3: 0.96,
          yield_b1_vs_ideal: 0.93,
        },
      ],
      PRECLASIF_B1_B3_IDEAL_COLUMNS,
    );

    expect(metrics.weight_b1_kg).toBe(300);
    expect(metrics.weight_b1ab_kg).toBe(225);
    expect(metrics.dispatch_1_pct).toBeCloseTo(-0.25, 8);
    expect(metrics.weight_b2_kg).toBe(335);
    expect(metrics.hydration_pct).toBeCloseTo(0.4888888889, 8);
    expect(metrics.weight_b3_kg).toBe(287);
    expect(metrics.dispatch_2_pct).toBeCloseTo(-0.1432835821, 8);
    expect(metrics.weight_ideal_kg).toBe(278);
    expect(metrics.yield_b1_vs_b3).toBeCloseTo(0.9566666667, 8);
    expect(metrics.yield_b1_vs_ideal).toBeCloseTo(0.9266666667, 8);
    expect(formatBalanzasTableMetric(metrics.dispatch_1_pct, PRECLASIF_B1_B3_IDEAL_COLUMNS[2]!)).toMatch(/-25,00\s?%/);
    expect(formatBalanzasTableMetric(metrics.hydration_pct, PRECLASIF_B1_B3_IDEAL_COLUMNS[4]!)).toMatch(/48,89\s?%/);
    expect(formatBalanzasTableMetric(metrics.dispatch_2_pct, PRECLASIF_B1_B3_IDEAL_COLUMNS[6]!)).toMatch(/-14,33\s?%/);
    expect(formatBalanzasTableMetric(metrics.yield_b1_vs_b3, PRECLASIF_B1_B3_IDEAL_COLUMNS[8]!)).toMatch(/95,67\s?%/);
    expect(formatBalanzasTableMetric(metrics.yield_b1_vs_ideal, PRECLASIF_B1_B3_IDEAL_COLUMNS[9]!)).toMatch(/92,67\s?%/);
  });

  it("formats flat-table text dates without leaking ISO timestamps", () => {
    expect(formatBalanzasTextValue("2026-04-25T12:30:00.000Z")).toBe("2026-04-25");
    expect(formatBalanzasTextValue("2026-04-24")).toBe("2026-04-24");
    expect(formatBalanzasTextValue(null)).toBe("—");
  });
});
