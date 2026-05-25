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
    cycleKey: "MH1-303-2024",
    parentBlock: "303",
    blockId: null,
    variety: "FREEDOM",
    spType: "P2",
    areaId: "A1",
    spDate: "2023-10-01",
    harvestStartDate: null,
    harvestEndDate: null,
    vegetativeDay: 101,
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
    expect(result.cycleKey).toBe("all");
    expect(result.variety).toBe("all");
    expect(result.spType).toBe("all");
    expect(result.areaId).toBe("all");
    expect(result.vegDayFrom).toBe("");
    expect(result.vegDayTo).toBe("");
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
    expect(defaultAlturasDronFilters.cycleKey).toBe("all");
    expect(defaultAlturasDronFilters.variety).toBe("all");
    expect(defaultAlturasDronFilters.spType).toBe("all");
    expect(defaultAlturasDronFilters.areaId).toBe("all");
    expect(defaultAlturasDronFilters.vegDayFrom).toBe("");
    expect(defaultAlturasDronFilters.vegDayTo).toBe("");
    expect(defaultAlturasDronFilters.q).toBe("");
    expect(defaultAlturasDronFilters.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(defaultAlturasDronFilters.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // Nuevos filtros v3
  it("preserva cycleKey multi-select", () => {
    const result = normalizeAlturasDronFilters({ cycleKey: "MH1-303-2024,MH1-304-2024" });
    expect(result.cycleKey).toBe("MH1-303-2024,MH1-304-2024");
  });

  it("normaliza cycleKey vacío a 'all'", () => {
    expect(normalizeAlturasDronFilters({ cycleKey: "" }).cycleKey).toBe("all");
    expect(normalizeAlturasDronFilters({ cycleKey: "all" }).cycleKey).toBe("all");
    expect(normalizeAlturasDronFilters({ cycleKey: undefined }).cycleKey).toBe("all");
  });

  it("preserva spType multi-select", () => {
    const result = normalizeAlturasDronFilters({ spType: "P1,P2,P3" });
    expect(result.spType).toBe("P1,P2,P3");
  });

  it("normaliza spType vacío a 'all'", () => {
    expect(normalizeAlturasDronFilters({ spType: "" }).spType).toBe("all");
    expect(normalizeAlturasDronFilters({ spType: "all" }).spType).toBe("all");
  });

  it("preserva areaId multi-select", () => {
    const result = normalizeAlturasDronFilters({ areaId: "A1,B2" });
    expect(result.areaId).toBe("A1,B2");
  });

  it("normaliza areaId vacío a 'all'", () => {
    expect(normalizeAlturasDronFilters({ areaId: "" }).areaId).toBe("all");
    expect(normalizeAlturasDronFilters({ areaId: "all" }).areaId).toBe("all");
  });

  it("normaliza vegDayFrom como entero string", () => {
    expect(normalizeAlturasDronFilters({ vegDayFrom: "30" }).vegDayFrom).toBe("30");
    expect(normalizeAlturasDronFilters({ vegDayFrom: "  45  " }).vegDayFrom).toBe("45");
    expect(normalizeAlturasDronFilters({ vegDayFrom: "" }).vegDayFrom).toBe("");
    expect(normalizeAlturasDronFilters({ vegDayFrom: undefined }).vegDayFrom).toBe("");
    expect(normalizeAlturasDronFilters({ vegDayFrom: "abc" }).vegDayFrom).toBe("");
  });

  it("normaliza vegDayTo como entero string", () => {
    expect(normalizeAlturasDronFilters({ vegDayTo: "90" }).vegDayTo).toBe("90");
    expect(normalizeAlturasDronFilters({ vegDayTo: "" }).vegDayTo).toBe("");
    expect(normalizeAlturasDronFilters({ vegDayTo: "xyz" }).vegDayTo).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeAlturasDronSummary
// ─────────────────────────────────────────────────────────────────────────────

describe("computeAlturasDronSummary", () => {
  it("devuelve vacíos canónicos para rango vacío", () => {
    const summary = computeAlturasDronSummary([]);
    expect(summary.totalDates).toBe(0);
    expect(summary.totalCycles).toBe(0);
    expect(summary.totalBlocks).toBe(0);
    expect(summary.lastDate).toBeNull();
    expect(summary.avgMeanLastDate).toBeNull();
    expect(summary.avgMedianLastDate).toBeNull();
    expect(summary.avgCvLastDate).toBeNull();
    expect(summary.avgGiniLastDate).toBeNull();
    expect(summary.avgEntropyLastDate).toBeNull();
    expect(summary.highCvCycleCount).toBe(0);
  });

  it("calcula correctamente con una sola fecha y un ciclo", () => {
    const rows = [makeRow({ eventDate: "2024-03-01", cycleKey: "MH1-303-2024", parentBlock: "303", mean: 1.5, cv: 0.25, gini: 0.15, entropyNorm: 0.82 })];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.totalDates).toBe(1);
    expect(summary.totalCycles).toBe(1);
    expect(summary.totalBlocks).toBe(1);
    expect(summary.lastDate).toBe("2024-03-01");
    expect(summary.avgMeanLastDate).toBeCloseTo(1.5, 4);
    expect(summary.avgCvLastDate).toBeCloseTo(0.25, 4);
    expect(summary.highCvCycleCount).toBe(0);
  });

  it("lastDate es la fecha máxima del rango", () => {
    const rows = [
      makeRow({ eventDate: "2024-01-01", cycleKey: "MH1-303-2024", parentBlock: "303", mean: 1.0 }),
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-303-2024", parentBlock: "303", mean: 1.8 }),
      makeRow({ eventDate: "2024-02-20", cycleKey: "MH1-304-2024", parentBlock: "304", mean: 1.2 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.lastDate).toBe("2024-03-15");
    expect(summary.totalDates).toBe(3);
    expect(summary.totalCycles).toBe(2);
    expect(summary.totalBlocks).toBe(2);
  });

  it("avgMeanLastDate promedia solo los ciclos de la última fecha", () => {
    const rows = [
      // fecha anterior — no debe entrar en el promedio
      makeRow({ eventDate: "2024-02-01", cycleKey: "MH1-303-2024", parentBlock: "303", mean: 2.0 }),
      // última fecha — dos ciclos
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-303-2024", parentBlock: "303", mean: 1.4 }),
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-304-2024", parentBlock: "304", mean: 1.6 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.lastDate).toBe("2024-03-15");
    // promedio de 1.4 y 1.6 = 1.5
    expect(summary.avgMeanLastDate).toBeCloseTo(1.5, 4);
  });

  it("avgMedianLastDate excluye nulls del promedio", () => {
    const rows = [
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-303-2024", parentBlock: "303", median: 1.4 }),
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-304-2024", parentBlock: "304", median: null }),
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-305-2024", parentBlock: "305", median: 1.6 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    // solo 1.4 y 1.6 — null excluido
    expect(summary.avgMedianLastDate).toBeCloseTo(1.5, 4);
  });

  it("highCvCycleCount cuenta correctamente ciclos con cv > 0.40", () => {
    const rows = [
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-303-2024", parentBlock: "303", cv: 0.39 }),
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-304-2024", parentBlock: "304", cv: 0.41 }),
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-305-2024", parentBlock: "305", cv: 0.55 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.highCvCycleCount).toBe(2);
  });

  it("highCvCycleCount ignora null cv (trata como 0, no supera umbral)", () => {
    const rows = [
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-303-2024", parentBlock: "303", cv: null }),
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-304-2024", parentBlock: "304", cv: 0.50 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.highCvCycleCount).toBe(1);
  });

  it("totalCycles cuenta ciclos únicos entre todas las fechas", () => {
    const rows = [
      makeRow({ eventDate: "2024-01-01", cycleKey: "MH1-303-2024", parentBlock: "303" }),
      makeRow({ eventDate: "2024-01-01", cycleKey: "MH1-304-2024", parentBlock: "304" }),
      makeRow({ eventDate: "2024-02-01", cycleKey: "MH1-303-2024", parentBlock: "303" }),
      makeRow({ eventDate: "2024-02-01", cycleKey: "MH1-305-2024", parentBlock: "305" }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.totalCycles).toBe(3); // MH1-303, MH1-304, MH1-305
    expect(summary.totalBlocks).toBe(3); // 303, 304, 305
    expect(summary.totalDates).toBe(2);
  });

  it("totalBlocks es independiente de totalCycles (mismo bloque, ciclos distintos)", () => {
    // Mismo parentBlock "303" pero dos cycle_keys distintos (raro pero posible)
    const rows = [
      makeRow({ eventDate: "2024-01-01", cycleKey: "MH1-303-2024", parentBlock: "303" }),
      makeRow({ eventDate: "2024-01-01", cycleKey: "MH1-303-2025", parentBlock: "303" }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.totalCycles).toBe(2);
    expect(summary.totalBlocks).toBe(1); // mismo bloque físico
  });

  it("avgGiniLastDate y avgEntropyLastDate excluyen nulls", () => {
    const rows = [
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-303-2024", parentBlock: "303", gini: 0.1, entropyNorm: 0.8 }),
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-304-2024", parentBlock: "304", gini: null, entropyNorm: null }),
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-305-2024", parentBlock: "305", gini: 0.3, entropyNorm: 0.6 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.avgGiniLastDate).toBeCloseTo(0.2, 4);
    expect(summary.avgEntropyLastDate).toBeCloseTo(0.7, 4);
  });

  it("devuelve null para avgCvLastDate cuando todos los cv son null en última fecha", () => {
    const rows = [
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-303-2024", parentBlock: "303", cv: null }),
      makeRow({ eventDate: "2024-03-15", cycleKey: "MH1-304-2024", parentBlock: "304", cv: null }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.avgCvLastDate).toBeNull();
  });

  it("calcula correctamente con múltiples fechas y el rango de lastDate tiene un solo ciclo", () => {
    const rows = [
      makeRow({ eventDate: "2024-01-01", cycleKey: "MH1-303-2024", parentBlock: "303", mean: 1.0, cv: 0.1 }),
      makeRow({ eventDate: "2024-01-01", cycleKey: "MH1-304-2024", parentBlock: "304", mean: 1.1, cv: 0.2 }),
      makeRow({ eventDate: "2024-04-01", cycleKey: "MH1-303-2024", parentBlock: "303", mean: 1.5, cv: 0.45 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.lastDate).toBe("2024-04-01");
    expect(summary.totalDates).toBe(2);
    expect(summary.totalCycles).toBe(2);
    expect(summary.totalBlocks).toBe(2);
    // Solo ciclo MH1-303 en la última fecha
    expect(summary.avgMeanLastDate).toBeCloseTo(1.5, 4);
    expect(summary.avgCvLastDate).toBeCloseTo(0.45, 4);
    // cv > 0.40 → 1 ciclo
    expect(summary.highCvCycleCount).toBe(1);
  });
});
