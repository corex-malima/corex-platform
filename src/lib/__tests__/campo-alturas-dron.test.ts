import { describe, expect, it } from "vitest";

import {
  computeAlturasDronSummary,
  defaultAlturasDronFilters,
  normalizeAlturasDronFilters,
  type AlturasDronStatsRow,
} from "@/lib/campo-alturas-dron";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de prueba
// ─────────────────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<AlturasDronStatsRow> = {}): AlturasDronStatsRow {
  return {
    eventDate: "2024-01-10",
    parentBlock: "303",
    blockId: null,
    cycleKey: "MH1-303-2024",
    variety: "FREEDOM",
    mean: 1.5,
    median: 1.45,
    sd: 0.12,
    iqr: 0.3,
    mad: 0.08,
    rSiqr: 0.222,
    rSmad: 0.119,
    cv: 0.25,
    rCviqr: 0.20,
    rCvmad: 0.08,
    p10: 1.2,
    p25: 1.35,
    p75: 1.65,
    p90: 1.8,
    bowleyV1: 0.05,
    bowleyV2: 0.04,
    fisher: 0.1,
    gini: 0.15,
    entropyNorm: 0.82,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// normalizeAlturasDronFilters
// ─────────────────────────────────────────────────────────────────────────────

describe("normalizeAlturasDronFilters", () => {
  it("aplica defaults si no se pasan argumentos", () => {
    const result = normalizeAlturasDronFilters();
    expect(result.block).toBe("all");
    expect(result.variety).toBe("all");
    expect(result.q).toBe("");
    expect(result.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.dateFrom < result.dateTo).toBe(true);
  });

  it("dateFrom inválido cae a hoy-90", () => {
    const result = normalizeAlturasDronFilters({ dateFrom: "not-a-date", dateTo: "2024-12-31" });
    expect(result.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.dateFrom).not.toBe("not-a-date");
  });

  it("dateTo inválido cae a hoy", () => {
    const result = normalizeAlturasDronFilters({ dateFrom: "2024-01-01", dateTo: "invalid" });
    expect(result.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.dateTo).not.toBe("invalid");
  });

  it("preserva multi-select codificado en block", () => {
    const result = normalizeAlturasDronFilters({ block: "303,304,305" });
    expect(result.block).toBe("303,304,305");
  });

  it("preserva multi-select codificado en variety", () => {
    const result = normalizeAlturasDronFilters({ variety: "FREEDOM,EXPLORER" });
    expect(result.variety).toBe("FREEDOM,EXPLORER");
  });

  it("normaliza block 'all' y vacío a 'all'", () => {
    expect(normalizeAlturasDronFilters({ block: "all" }).block).toBe("all");
    expect(normalizeAlturasDronFilters({ block: "" }).block).toBe("all");
    expect(normalizeAlturasDronFilters({ block: undefined }).block).toBe("all");
  });

  it("normaliza variety 'all' y vacío a 'all'", () => {
    expect(normalizeAlturasDronFilters({ variety: "all" }).variety).toBe("all");
    expect(normalizeAlturasDronFilters({ variety: "" }).variety).toBe("all");
    expect(normalizeAlturasDronFilters({ variety: undefined }).variety).toBe("all");
  });

  it("normaliza q limpiando espacios iniciales y finales", () => {
    const result = normalizeAlturasDronFilters({ q: "  303  " });
    expect(result.q).toBe("303");
  });

  it("exporta defaultAlturasDronFilters como constante válida", () => {
    expect(defaultAlturasDronFilters.block).toBe("all");
    expect(defaultAlturasDronFilters.variety).toBe("all");
    expect(defaultAlturasDronFilters.q).toBe("");
    expect(defaultAlturasDronFilters.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(defaultAlturasDronFilters.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeAlturasDronSummary
// ─────────────────────────────────────────────────────────────────────────────

describe("computeAlturasDronSummary", () => {
  it("devuelve vacíos canónicos para rango vacío", () => {
    const summary = computeAlturasDronSummary([]);
    expect(summary.totalDates).toBe(0);
    expect(summary.totalBlocks).toBe(0);
    expect(summary.lastDate).toBeNull();
    expect(summary.avgMeanLastDate).toBeNull();
    expect(summary.avgMedianLastDate).toBeNull();
    expect(summary.avgCvLastDate).toBeNull();
    expect(summary.avgGiniLastDate).toBeNull();
    expect(summary.avgEntropyLastDate).toBeNull();
    expect(summary.highCvBlockCount).toBe(0);
  });

  it("calcula correctamente con una sola fecha y un bloque", () => {
    const rows = [makeRow({ eventDate: "2024-03-01", parentBlock: "303", mean: 1.5, cv: 0.25, gini: 0.15, entropyNorm: 0.82 })];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.totalDates).toBe(1);
    expect(summary.totalBlocks).toBe(1);
    expect(summary.lastDate).toBe("2024-03-01");
    expect(summary.avgMeanLastDate).toBeCloseTo(1.5, 4);
    expect(summary.avgCvLastDate).toBeCloseTo(0.25, 4);
    expect(summary.highCvBlockCount).toBe(0);
  });

  it("lastDate es la fecha máxima del rango", () => {
    const rows = [
      makeRow({ eventDate: "2024-01-01", parentBlock: "303", mean: 1.0 }),
      makeRow({ eventDate: "2024-03-15", parentBlock: "303", mean: 1.8 }),
      makeRow({ eventDate: "2024-02-20", parentBlock: "304", mean: 1.2 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.lastDate).toBe("2024-03-15");
    expect(summary.totalDates).toBe(3);
    expect(summary.totalBlocks).toBe(2);
  });

  it("avgMeanLastDate promedia solo los bloques de la última fecha", () => {
    const rows = [
      // fecha anterior — no debe entrar en el promedio
      makeRow({ eventDate: "2024-02-01", parentBlock: "303", mean: 2.0 }),
      // última fecha — dos bloques
      makeRow({ eventDate: "2024-03-15", parentBlock: "303", mean: 1.4 }),
      makeRow({ eventDate: "2024-03-15", parentBlock: "304", mean: 1.6 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.lastDate).toBe("2024-03-15");
    // promedio de 1.4 y 1.6 = 1.5
    expect(summary.avgMeanLastDate).toBeCloseTo(1.5, 4);
  });

  it("avgMedianLastDate excluye nulls del promedio", () => {
    const rows = [
      makeRow({ eventDate: "2024-03-15", parentBlock: "303", median: 1.4 }),
      makeRow({ eventDate: "2024-03-15", parentBlock: "304", median: null }),
      makeRow({ eventDate: "2024-03-15", parentBlock: "305", median: 1.6 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    // solo 1.4 y 1.6 — null excluido
    expect(summary.avgMedianLastDate).toBeCloseTo(1.5, 4);
  });

  it("highCvBlockCount cuenta correctamente bloques con cv > 0.40", () => {
    const rows = [
      makeRow({ eventDate: "2024-03-15", parentBlock: "303", cv: 0.39 }),
      makeRow({ eventDate: "2024-03-15", parentBlock: "304", cv: 0.41 }),
      makeRow({ eventDate: "2024-03-15", parentBlock: "305", cv: 0.55 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.highCvBlockCount).toBe(2);
  });

  it("highCvBlockCount ignora null cv (trata como 0, no supera umbral)", () => {
    const rows = [
      makeRow({ eventDate: "2024-03-15", parentBlock: "303", cv: null }),
      makeRow({ eventDate: "2024-03-15", parentBlock: "304", cv: 0.50 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.highCvBlockCount).toBe(1);
  });

  it("totalBlocks cuenta bloques únicos entre todas las fechas", () => {
    const rows = [
      makeRow({ eventDate: "2024-01-01", parentBlock: "303" }),
      makeRow({ eventDate: "2024-01-01", parentBlock: "304" }),
      makeRow({ eventDate: "2024-02-01", parentBlock: "303" }),
      makeRow({ eventDate: "2024-02-01", parentBlock: "305" }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.totalBlocks).toBe(3); // 303, 304, 305
    expect(summary.totalDates).toBe(2);
  });

  it("avgGiniLastDate y avgEntropyLastDate excluyen nulls", () => {
    const rows = [
      makeRow({ eventDate: "2024-03-15", parentBlock: "303", gini: 0.1, entropyNorm: 0.8 }),
      makeRow({ eventDate: "2024-03-15", parentBlock: "304", gini: null, entropyNorm: null }),
      makeRow({ eventDate: "2024-03-15", parentBlock: "305", gini: 0.3, entropyNorm: 0.6 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.avgGiniLastDate).toBeCloseTo(0.2, 4);
    expect(summary.avgEntropyLastDate).toBeCloseTo(0.7, 4);
  });

  it("devuelve null para avgCvLastDate cuando todos los cv son null en última fecha", () => {
    const rows = [
      makeRow({ eventDate: "2024-03-15", parentBlock: "303", cv: null }),
      makeRow({ eventDate: "2024-03-15", parentBlock: "304", cv: null }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.avgCvLastDate).toBeNull();
  });

  it("calcula correctamente con múltiples fechas y el rango de lastDate tiene un solo bloque", () => {
    const rows = [
      makeRow({ eventDate: "2024-01-01", parentBlock: "303", mean: 1.0, cv: 0.1 }),
      makeRow({ eventDate: "2024-01-01", parentBlock: "304", mean: 1.1, cv: 0.2 }),
      makeRow({ eventDate: "2024-04-01", parentBlock: "303", mean: 1.5, cv: 0.45 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.lastDate).toBe("2024-04-01");
    expect(summary.totalDates).toBe(2);
    expect(summary.totalBlocks).toBe(2);
    // Solo bloque 303 en la última fecha
    expect(summary.avgMeanLastDate).toBeCloseTo(1.5, 4);
    expect(summary.avgCvLastDate).toBeCloseTo(0.45, 4);
    // cv > 0.40 → 1 bloque
    expect(summary.highCvBlockCount).toBe(1);
  });
});
