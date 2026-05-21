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
    alturaM: 1.5,
    cv: 0.25,
    mediana: 1.45,
    sd: 0.12,
    p10: 1.2,
    p90: 1.8,
    q1: 1.35,
    q3: 1.65,
    iqr: 0.3,
    skewFisher: 0.1,
    mad: 0.08,
    shannon: 2.1,
    nEffective: 120,
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
    expect(result.q).toBe("");
    // dateFrom y dateTo deben ser ISO válidos
    expect(result.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // dateFrom debe ser antes que dateTo (90 días de diferencia)
    expect(result.dateFrom < result.dateTo).toBe(true);
  });

  it("dateFrom inválido cae a hoy-90", () => {
    const result = normalizeAlturasDronFilters({ dateFrom: "not-a-date", dateTo: "2024-12-31" });
    expect(result.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // La fecha generada por el fallback debe diferir de "not-a-date"
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

  it("preserva multi-select codificado en cycleKey", () => {
    const result = normalizeAlturasDronFilters({ cycleKey: "MH1-303-2024,MH1-304-2024" });
    expect(result.cycleKey).toBe("MH1-303-2024,MH1-304-2024");
  });

  it("normaliza block 'all' y vacío a 'all'", () => {
    expect(normalizeAlturasDronFilters({ block: "all" }).block).toBe("all");
    expect(normalizeAlturasDronFilters({ block: "" }).block).toBe("all");
    expect(normalizeAlturasDronFilters({ block: undefined }).block).toBe("all");
  });

  it("normaliza q limpiando espacios iniciales y finales", () => {
    const result = normalizeAlturasDronFilters({ q: "  303  " });
    expect(result.q).toBe("303");
  });

  it("exporta defaultAlturasDronFilters como constante válida", () => {
    expect(defaultAlturasDronFilters.block).toBe("all");
    expect(defaultAlturasDronFilters.cycleKey).toBe("all");
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
    expect(summary.avgHeightLastDate).toBeNull();
    expect(summary.avgCvLastDate).toBeNull();
    expect(summary.highCvBlockCount).toBe(0);
  });

  it("calcula correctamente con una sola fecha y un bloque", () => {
    const rows = [makeRow({ eventDate: "2024-03-01", parentBlock: "303", alturaM: 1.5, cv: 0.25 })];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.totalDates).toBe(1);
    expect(summary.totalBlocks).toBe(1);
    expect(summary.lastDate).toBe("2024-03-01");
    expect(summary.avgHeightLastDate).toBeCloseTo(1.5, 3);
    expect(summary.avgCvLastDate).toBeCloseTo(0.25, 4);
    expect(summary.highCvBlockCount).toBe(0);
  });

  it("lastDate es la fecha máxima del rango", () => {
    const rows = [
      makeRow({ eventDate: "2024-01-01", parentBlock: "303", alturaM: 1.0 }),
      makeRow({ eventDate: "2024-03-15", parentBlock: "303", alturaM: 1.8 }),
      makeRow({ eventDate: "2024-02-20", parentBlock: "304", alturaM: 1.2 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.lastDate).toBe("2024-03-15");
    expect(summary.totalDates).toBe(3);
    expect(summary.totalBlocks).toBe(2);
  });

  it("avgHeightLastDate promedia solo los bloques de la última fecha", () => {
    const rows = [
      // fecha anterior — no debe entrar en el promedio
      makeRow({ eventDate: "2024-02-01", parentBlock: "303", alturaM: 2.0 }),
      // última fecha — dos bloques
      makeRow({ eventDate: "2024-03-15", parentBlock: "303", alturaM: 1.4 }),
      makeRow({ eventDate: "2024-03-15", parentBlock: "304", alturaM: 1.6 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    expect(summary.lastDate).toBe("2024-03-15");
    // promedio de 1.4 y 1.6 = 1.5
    expect(summary.avgHeightLastDate).toBeCloseTo(1.5, 3);
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

  it("highCvBlockCount ignora null cv", () => {
    const rows = [
      makeRow({ eventDate: "2024-03-15", parentBlock: "303", cv: null }),
      makeRow({ eventDate: "2024-03-15", parentBlock: "304", cv: 0.50 }),
    ];
    const summary = computeAlturasDronSummary(rows);
    // cv null se trata como 0 (< 0.40) en el filter
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
});
