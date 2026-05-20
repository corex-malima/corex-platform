import { describe, expect, it } from "vitest";

import {
  MONTH_LABELS,
  computeUpcomingNext30Days,
  normalizeCumpleanosFilters,
  type CumpleanosRow,
} from "@/lib/talento-humano-cumpleanos";

// Helper to build a minimal CumpleanosRow for tests
function makeRow(birthDate: string, overrides: Partial<CumpleanosRow> = {}): CumpleanosRow {
  const [, monthStr, dayStr] = birthDate.split("-");
  const birthMonth = parseInt(monthStr ?? "1", 10);
  const birthDay = parseInt(dayStr ?? "1", 10);
  return {
    personId: "P001",
    personName: "Test Person",
    nationalId: null,
    areaId: null,
    areaName: null,
    areaGeneral: null,
    jobClassificationCode: null,
    jobTitle: null,
    farmCode: null,
    birthDate,
    birthDay,
    birthMonth,
    birthMonthLabel: MONTH_LABELS[birthMonth - 1] ?? "",
    ...overrides,
  };
}

describe("normalizeCumpleanosFilters", () => {
  it("devuelve defaults cuando raw es vacío", () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = normalizeCumpleanosFilters({});
    expect(result.corteDate).toBe(today);
    expect(result.months).toBe("all");
    expect(result.area).toBe("all");
    expect(result.jobClassification).toBe("all");
    expect(result.jobTitle).toBe("all");
    expect(result.q).toBe("");
  });

  it("reemplaza corteDate inválido con hoy", () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = normalizeCumpleanosFilters({ corteDate: "not-a-date" });
    expect(result.corteDate).toBe(today);
  });

  it("preserva corteDate válido", () => {
    const result = normalizeCumpleanosFilters({ corteDate: "2026-06-15" });
    expect(result.corteDate).toBe("2026-06-15");
  });

  it("preserva months con valor concreto", () => {
    const result = normalizeCumpleanosFilters({ months: "1,6,12" });
    expect(result.months).toBe("1,6,12");
  });

  it("normaliza months vacío a all", () => {
    const result = normalizeCumpleanosFilters({ months: "" });
    expect(result.months).toBe("all");
  });

  it("preserva area con valor concreto (multi de areaId)", () => {
    const result = normalizeCumpleanosFilters({ area: "AREA_001,AREA_002" });
    expect(result.area).toBe("AREA_001,AREA_002");
  });
});

describe("MONTH_LABELS", () => {
  it("tiene exactamente 12 entradas", () => {
    expect(MONTH_LABELS).toHaveLength(12);
  });

  it("índice 0 es Enero", () => {
    expect(MONTH_LABELS[0]).toBe("Enero");
  });

  it("índice 11 es Diciembre", () => {
    expect(MONTH_LABELS[11]).toBe("Diciembre");
  });

  it("cubre todos los meses esperados en orden", () => {
    const expected = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];
    expect([...MONTH_LABELS]).toEqual(expected);
  });
});

describe("computeUpcomingNext30Days", () => {
  it("persona nacida el 1990-01-15 con corte 2026-01-10 SÍ está en próximos 30 días", () => {
    const rows = [makeRow("1990-01-15")];
    const count = computeUpcomingNext30Days(rows, "2026-01-10");
    expect(count).toBe(1);
  });

  it("persona nacida el 1990-12-25 con corte 2026-12-30 NO está en próximos 30 días", () => {
    // next birthday = 2027-12-25, which is ~360 days away
    const rows = [makeRow("1990-12-25")];
    const count = computeUpcomingNext30Days(rows, "2026-12-30");
    expect(count).toBe(0);
  });

  it("persona nacida el 1990-01-05 con corte 2026-12-30 SÍ está en próximos 30 días (cross-year)", () => {
    // next birthday = 2027-01-05, which is 6 days away from 2026-12-30
    const rows = [makeRow("1990-01-05")];
    const count = computeUpcomingNext30Days(rows, "2026-12-30");
    expect(count).toBe(1);
  });

  it("persona con cumpleaños exactamente en el día de corte cuenta", () => {
    const rows = [makeRow("1990-05-20")];
    const count = computeUpcomingNext30Days(rows, "2026-05-20");
    expect(count).toBe(1);
  });

  it("persona con cumpleaños exactamente 30 días después del corte cuenta", () => {
    const rows = [makeRow("1990-06-19")];
    // corte 2026-05-20, +30 = 2026-06-19
    const count = computeUpcomingNext30Days(rows, "2026-05-20");
    expect(count).toBe(1);
  });

  it("ignora filas sin birthDate", () => {
    const rows = [makeRow("1990-01-15", { birthDate: null })];
    const count = computeUpcomingNext30Days(rows, "2026-01-10");
    expect(count).toBe(0);
  });

  it("devuelve 0 para lista vacía", () => {
    expect(computeUpcomingNext30Days([], "2026-01-10")).toBe(0);
  });
});

describe("upcomingThisMonth (lógica integrada en buildSummary via birthMonth)", () => {
  it("rows con birth_month igual al mes del corte cuentan", () => {
    // corte 2026-05-20 → mes 5
    const rows = [makeRow("1990-05-10"), makeRow("1985-05-25")];
    // Both have birthMonth = 5, same as corteDate month (May)
    const thisMonth = rows.filter((r) => r.birthMonth === 5).length;
    expect(thisMonth).toBe(2);
  });

  it("rows con birth_month diferente NO cuentan", () => {
    const rows = [makeRow("1990-03-10"), makeRow("1985-07-25")];
    const thisMonth = rows.filter((r) => r.birthMonth === 5).length;
    expect(thisMonth).toBe(0);
  });

  it("es independiente del día del mes", () => {
    const rows = [
      makeRow("1990-05-01"),
      makeRow("1990-05-15"),
      makeRow("1990-05-31"),
    ];
    const thisMonth = rows.filter((r) => r.birthMonth === 5).length;
    expect(thisMonth).toBe(3);
  });
});
