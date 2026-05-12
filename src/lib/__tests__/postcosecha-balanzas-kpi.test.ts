import { describe, expect, it } from "vitest";

import {
  computeAdjustmentKpi,
  computeHydrationKpi,
  computeWasteKpi,
  dateToYyww,
  resolveMetaOrigin,
  resolveDwOrigin,
  resolveVarietyFromFarm,
  type AdjustmentColumnConfig,
  type HydrationColumnConfig,
  type WasteColumnConfig,
} from "@/lib/postcosecha-balanzas-kpi";
import {
  ajusteAccent,
  cumplimientoAccent,
  cumplimientoAccentInverso,
} from "@/shared/lib/cumplimiento";

// ─── Helpers para constructores de filas ──────────────────────────────────────

const HYD_COL: HydrationColumnConfig = {
  b1cKey: "weight_b1c_estimated_kg",
  b2Key: "weight_b2_kg",
  gradeKey: "grade",
};

const WASTE_COL: WasteColumnConfig = {
  b2Key: "weight_b2_kg",
  b2aKey: "weight_b2a_kg",
  destinationKey: "destination",
};

const ADJ_COL: AdjustmentColumnConfig = {
  weightPerStemKey: "weight_per_stem_kg",
  b1cKey: "weight_b1c_estimated_kg",
  lotDateKey: "lot_date",
  workDateKey: "work_date",
  gradeKey: "grade",
  destinationKey: "destination",
};

// ─── Mapping helpers ──────────────────────────────────────────────────────────

describe("mapping helpers (branch / farm → códigos canónicos)", () => {
  it("resolveMetaOrigin mapea branch del nodo a origin_code de metas", () => {
    expect(resolveMetaOrigin("apertura")).toBe("opening");
    expect(resolveMetaOrigin("gv")).toBe("gv");
    expect(resolveMetaOrigin("preclasif")).toBe("preclassification");
    expect(resolveMetaOrigin("unknown")).toBeNull();
  });

  it("resolveDwOrigin devuelve etiquetas DW (uppercase español)", () => {
    expect(resolveDwOrigin("apertura")).toBe("APERTURA");
    expect(resolveDwOrigin("gv")).toBe("GV");
    expect(resolveDwOrigin("preclasif")).toBe("PRECLASIFICACION");
    expect(resolveDwOrigin("xxx")).toBeNull();
  });

  it("resolveVarietyFromFarm mapea sufijo finca → variety code del ML", () => {
    expect(resolveVarietyFromFarm("xl")).toBe("XLE");
    expect(resolveVarietyFromFarm("cl")).toBe("CLO");
    expect(resolveVarietyFromFarm("zn")).toBe("ZIN");
    expect(resolveVarietyFromFarm("yz")).toBeNull();
  });
});

// ─── dateToYyww ───────────────────────────────────────────────────────────────

describe("dateToYyww (YYWW de 4 dígitos, mismo formato que iso_week_id)", () => {
  it("convierte Date / string a YYWW", () => {
    // 2026-01-05 lunes → semana ISO 02 de 2026 → "2602"
    expect(dateToYyww("2026-01-05")).toBe("2602");
    // 2026-12-28 lunes → semana 53 de 2026 (ISO long year) → "2653"
    expect(dateToYyww("2026-12-28")).toBe("2653");
    // 2025-01-01 miércoles → todavía es semana 01 de 2025 → "2501"
    expect(dateToYyww("2025-01-01")).toBe("2501");
  });

  it("retorna null para input inválido", () => {
    expect(dateToYyww(null)).toBeNull();
    expect(dateToYyww(undefined)).toBeNull();
    expect(dateToYyww("not-a-date")).toBeNull();
  });
});

// ─── Hidratación ──────────────────────────────────────────────────────────────

describe("computeHydrationKpi", () => {
  const targets = new Map<string, number>([
    ["opening|BQT", 1.68],
    ["opening|15", 1.37],
    ["opening|75", 0.41],
  ]);

  it("un solo grado: cumplimiento = real / meta directa", () => {
    const rows = [{ grade: "BQT", weight_b1c_estimated_kg: 168, weight_b2_kg: 100 }];
    const k = computeHydrationKpi(rows, HYD_COL, targets, "opening");
    expect(k.real).toBeCloseTo(1.68, 5);
    expect(k.meta).toBeCloseTo(1.68, 5);
    expect(k.cumplimiento).toBeCloseTo(1.0, 5);
    expect(k.rowsCount).toBe(1);
    expect(k.rowsMissingMeta).toBe(0);
  });

  it("multi-grado: meta ponderada por peso_b2", () => {
    // BQT (meta=1.68) y 15 (meta=1.37). Peso B2 = 100 y 100.
    // Hidratación real = SUM(b1c)/SUM(b2). Meta ponderada = (1.68*100 + 1.37*100)/200 = 1.525.
    const rows = [
      { grade: "BQT", weight_b1c_estimated_kg: 150, weight_b2_kg: 100 },
      { grade: "15",  weight_b1c_estimated_kg: 130, weight_b2_kg: 100 },
    ];
    const k = computeHydrationKpi(rows, HYD_COL, targets, "opening");
    expect(k.real).toBeCloseTo(280 / 200, 5);   // 1.40
    expect(k.meta).toBeCloseTo(1.525, 5);
    expect(k.cumplimiento).toBeCloseTo(1.40 / 1.525, 5);
  });

  it("ponderación NO es promedio simple cuando pesos difieren", () => {
    // BQT con b2=900, 15 con b2=100 → meta ponderada ≈ 1.649
    // promedio simple sería 1.525
    const rows = [
      { grade: "BQT", weight_b1c_estimated_kg: 1000, weight_b2_kg: 900 },
      { grade: "15",  weight_b1c_estimated_kg: 130,  weight_b2_kg: 100 },
    ];
    const k = computeHydrationKpi(rows, HYD_COL, targets, "opening");
    const expectedMeta = (1.68 * 900 + 1.37 * 100) / 1000;
    expect(k.meta).toBeCloseTo(expectedMeta, 5);
    expect(k.meta).not.toBeCloseTo(1.525, 2); // ≠ promedio simple
  });

  it("filas sin meta se cuentan en real, pero NO en denominador de meta ponderada", () => {
    const rows = [
      { grade: "BQT",  weight_b1c_estimated_kg: 100, weight_b2_kg: 100 }, // meta=1.68
      { grade: "OTRO", weight_b1c_estimated_kg: 100, weight_b2_kg: 100 }, // sin meta
    ];
    const k = computeHydrationKpi(rows, HYD_COL, targets, "opening");
    expect(k.real).toBeCloseTo(1.0, 5);
    expect(k.meta).toBeCloseTo(1.68, 5); // solo BQT cuenta
    expect(k.rowsMissingMeta).toBe(1);
  });

  it("rows vacío → real, meta y cumplimiento null", () => {
    const k = computeHydrationKpi([], HYD_COL, targets, "opening");
    expect(k.real).toBeNull();
    expect(k.meta).toBeNull();
    expect(k.cumplimiento).toBeNull();
    expect(k.rowsCount).toBe(0);
  });

  it("rows con b2 ≤ 0 se ignoran (no contaminan num/den)", () => {
    const rows = [
      { grade: "BQT", weight_b1c_estimated_kg: 1000, weight_b2_kg: 0 },
      { grade: "BQT", weight_b1c_estimated_kg: 168,  weight_b2_kg: 100 },
    ];
    const k = computeHydrationKpi(rows, HYD_COL, targets, "opening");
    expect(k.rowsCount).toBe(1);
    expect(k.real).toBeCloseTo(1.68, 5);
  });
});

// ─── Desperdicio ──────────────────────────────────────────────────────────────

describe("computeWasteKpi (convención negativa, menor es mejor)", () => {
  const targets = new Map<string, number>([
    ["opening|BLANCO", 0.27],
    ["opening|TINTURADO", 0.25],
    ["opening|ARCOIRIS", 0.29],
  ]);

  it("real y meta se devuelven en negativo", () => {
    const rows = [{ destination: "BLANCO", weight_b2_kg: 1000, weight_b2a_kg: 200 }];
    const k = computeWasteKpi(rows, WASTE_COL, targets, "opening");
    expect(k.real).toBeCloseTo(-0.20, 5);
    expect(k.meta).toBeCloseTo(-0.27, 5);
  });

  it("cumplimiento = |meta|/|real|, >1 cuando real < meta en magnitud", () => {
    // real = -0.20 (mejor que meta -0.27) → |0.27|/|0.20| = 1.35 → sobre meta.
    const rows = [{ destination: "BLANCO", weight_b2_kg: 1000, weight_b2a_kg: 200 }];
    const k = computeWasteKpi(rows, WASTE_COL, targets, "opening");
    expect(k.cumplimiento).toBeCloseTo(1.35, 5);
  });

  it("cumplimiento < 1 cuando real excede la meta", () => {
    // real = -0.40 (peor que -0.27) → 0.27/0.40 = 0.675 → bajo meta.
    const rows = [{ destination: "BLANCO", weight_b2_kg: 1000, weight_b2a_kg: 400 }];
    const k = computeWasteKpi(rows, WASTE_COL, targets, "opening");
    expect(k.real).toBeCloseTo(-0.40, 5);
    expect(k.cumplimiento).toBeCloseTo(0.675, 5);
  });

  it("multi-destino: meta ponderada por peso_b2", () => {
    // BLANCO (meta 0.27, b2=600) + ARCOIRIS (meta 0.29, b2=400)
    // → meta ponderada = -(0.27*600 + 0.29*400)/1000 = -0.278
    const rows = [
      { destination: "BLANCO",   weight_b2_kg: 600, weight_b2a_kg: 150 },
      { destination: "ARCOIRIS", weight_b2_kg: 400, weight_b2a_kg: 100 },
    ];
    const k = computeWasteKpi(rows, WASTE_COL, targets, "opening");
    expect(k.meta).toBeCloseTo(-0.278, 5);
    expect(k.real).toBeCloseTo(-(250 / 1000), 5); // -0.25
  });

  it("rows vacío → null", () => {
    const k = computeWasteKpi([], WASTE_COL, targets, "opening");
    expect(k.real).toBeNull();
    expect(k.meta).toBeNull();
    expect(k.cumplimiento).toBeNull();
  });
});

// ─── Ajuste ───────────────────────────────────────────────────────────────────

describe("computeAdjustmentKpi", () => {
  const factorIndex = {
    byFull: new Map<string, number>(),
    byWorkDate: new Map<string, number>(),
    byGradeDest: new Map<string, number>([
      ["BQT|BLANCO", 1.5],
      ["20|TINTURADO", 1.8],
    ]),
  };
  const params = { alpha: 0.8, beta: 0.19 };

  it("razon = 1.0 → bruto = 0.99 → final = 0.99 (dentro del rango)", () => {
    // peso_tallo_estimado_ponderado = 1*1.5 = 1.5 (1 row, wps=1, hf=1.5)
    // venta semana = 1.5 (manual) → razón = 1.0 → bruto = 0.99
    const rows = [{
      work_date: "2026-01-05",
      grade: "BQT",
      destination: "BLANCO",
      weight_per_stem_kg: 1,
      weight_b1c_estimated_kg: 100,
    }];
    const sales = new Map<string, number>([["2602", 1.5]]);
    const k = computeAdjustmentKpi(rows, ADJ_COL, factorIndex, sales, params);
    expect(k.razonAjuste).toBeCloseTo(1.0, 5);
    expect(k.ajusteBruto).toBeCloseTo(0.99, 5);
    expect(k.ajusteFinal).toBeCloseTo(0.99, 5);
  });

  it("razon muy alta (2.0) → bruto > 1.02 → final censurado a 1.02", () => {
    const rows = [{
      work_date: "2026-01-05",
      grade: "BQT",
      destination: "BLANCO",
      weight_per_stem_kg: 1,
      weight_b1c_estimated_kg: 100,
    }];
    const sales = new Map<string, number>([["2602", 3.0]]); // razon=3/1.5=2
    const k = computeAdjustmentKpi(rows, ADJ_COL, factorIndex, sales, params);
    expect(k.razonAjuste).toBeCloseTo(2.0, 5);
    expect(k.ajusteBruto).toBeCloseTo(0.8 + 0.19 * 2.0, 5); // 1.18
    expect(k.ajusteFinal).toBeCloseTo(1.02, 5); // censurado
  });

  it("razon muy baja (0.5) → bruto < 0.98 → final censurado a 0.98", () => {
    const rows = [{
      work_date: "2026-01-05",
      grade: "BQT",
      destination: "BLANCO",
      weight_per_stem_kg: 1,
      weight_b1c_estimated_kg: 100,
    }];
    const sales = new Map<string, number>([["2602", 0.75]]); // razon=0.75/1.5=0.5
    const k = computeAdjustmentKpi(rows, ADJ_COL, factorIndex, sales, params);
    expect(k.ajusteBruto).toBeCloseTo(0.895, 5);
    expect(k.ajusteFinal).toBeCloseTo(0.98, 5); // censurado
  });

  it("rows sin factor ML disponible se ignoran (no rompen)", () => {
    const rows = [{
      work_date: "2026-01-05",
      grade: "SIN_FACTOR",
      destination: "BLANCO",
      weight_per_stem_kg: 1,
      weight_b1c_estimated_kg: 100,
    }];
    const sales = new Map<string, number>([["2602", 1.5]]);
    const k = computeAdjustmentKpi(rows, ADJ_COL, factorIndex, sales, params);
    expect(k.pesoTalloEstimadoPonderado).toBeNull();
    expect(k.razonAjuste).toBeNull();
    expect(k.ajusteFinal).toBeNull();
  });

  it("rows sin venta semanal se ignoran (skip esa semana)", () => {
    const rows = [{
      work_date: "2026-01-05",
      grade: "BQT",
      destination: "BLANCO",
      weight_per_stem_kg: 1,
      weight_b1c_estimated_kg: 100,
    }];
    const sales = new Map<string, number>(); // sin "2602"
    const k = computeAdjustmentKpi(rows, ADJ_COL, factorIndex, sales, params);
    expect(k.ajusteFinal).toBeNull();
    expect(k.weeksCovered).toEqual(["2602"]);
  });

  it("multi-semana: peso_tallo_estimado_ponderado y peso_tallo_venta promediados por peso_b1c", () => {
    // semana 2602: wps=1, hf=1.5, b1c=100 → estimado=1.5; venta=1.5
    // semana 2603: wps=1, hf=1.5, b1c=200 → estimado=1.5; venta=1.65
    // total b1c = 300
    // estimado global = (1.5*100 + 1.5*200)/300 = 1.5
    // venta global = (1.5*100 + 1.65*200)/300 = 1.60
    // razón = 1.60/1.5 ≈ 1.0667 → bruto = 0.8 + 0.19*1.0667 = 1.0027 (dentro)
    const rows = [
      { work_date: "2026-01-05", grade: "BQT", destination: "BLANCO", weight_per_stem_kg: 1, weight_b1c_estimated_kg: 100 },
      { work_date: "2026-01-12", grade: "BQT", destination: "BLANCO", weight_per_stem_kg: 1, weight_b1c_estimated_kg: 200 },
    ];
    const sales = new Map<string, number>([
      ["2602", 1.5],
      ["2603", 1.65],
    ]);
    const k = computeAdjustmentKpi(rows, ADJ_COL, factorIndex, sales, params);
    expect(k.pesoTalloEstimadoPonderado).toBeCloseTo(1.5, 5);
    expect(k.pesoTalloVenta).toBeCloseTo(1.6, 5);
    expect(k.razonAjuste).toBeCloseTo(1.0667, 3);
    expect(k.ajusteFinal).toBeCloseTo(1.0027, 3);
    expect(k.weeksCovered.sort()).toEqual(["2602", "2603"]);
  });

  it("usa byFull cuando lot_date está disponible y matchea", () => {
    const factorIdxFull = {
      byFull: new Map<string, number>([
        ["2025-12-30|2026-01-05|BQT|BLANCO", 2.0],
      ]),
      byWorkDate: new Map<string, number>(),
      byGradeDest: new Map<string, number>([
        ["BQT|BLANCO", 1.5], // fallback que NO debería usarse
      ]),
    };
    const rows = [{
      lot_date: "2025-12-30",
      work_date: "2026-01-05",
      grade: "BQT",
      destination: "BLANCO",
      weight_per_stem_kg: 1,
      weight_b1c_estimated_kg: 100,
    }];
    const sales = new Map<string, number>([["2602", 2.0]]); // razon=2.0/2.0=1.0
    const k = computeAdjustmentKpi(rows, ADJ_COL, factorIdxFull, sales, params);
    // Si tomó byFull (2.0), estimado=2.0, razón=1.0, bruto=0.99
    expect(k.pesoTalloEstimadoPonderado).toBeCloseTo(2.0, 5);
    expect(k.ajusteFinal).toBeCloseTo(0.99, 5);
  });
});

// ─── cumplimiento accent helpers ──────────────────────────────────────────────

describe("cumplimientoAccent / ajusteAccent", () => {
  it("cumplimiento sobre meta → success; cerca → warning; bajo → danger; null → default", () => {
    expect(cumplimientoAccent(1.05)).toBe("success");
    expect(cumplimientoAccent(1.0)).toBe("success");
    expect(cumplimientoAccent(0.9)).toBe("warning");
    expect(cumplimientoAccent(0.8)).toBe("warning");
    expect(cumplimientoAccent(0.79)).toBe("danger");
    expect(cumplimientoAccent(null)).toBe("default");
    expect(cumplimientoAccent(NaN)).toBe("default");
  });

  it("cumplimientoAccentInverso usa los mismos umbrales (real ya es |meta|/|real|)", () => {
    expect(cumplimientoAccentInverso(1.1)).toBe("success");
    expect(cumplimientoAccentInverso(0.9)).toBe("warning");
    expect(cumplimientoAccentInverso(0.5)).toBe("danger");
  });

  it("ajusteAccent: tocó borde 0.98 o 1.02 → warning; interior → success", () => {
    expect(ajusteAccent(1.0)).toBe("success");
    expect(ajusteAccent(0.98)).toBe("warning");
    expect(ajusteAccent(1.02)).toBe("warning");
    expect(ajusteAccent(null)).toBe("default");
  });
});
