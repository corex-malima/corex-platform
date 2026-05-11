import { describe, expect, it } from "vitest";

import { calculateCollaboratorPerformanceTotals, formatTenureLabel } from "@/lib/talento-humano-colaboradores-utils";

describe("calculateCollaboratorPerformanceTotals", () => {
  it("calcula rendimiento y minimo ponderado por horas con rendimiento", () => {
    const totals = calculateCollaboratorPerformanceTotals([
      {
        actualHoursHn: 0,
        actualHoursRend: 10,
        effectiveHoursRend: 9,
        actualHoursForRend: 10,
        rendMinWeightedBase: 0.8 * 10,
        totalActualHours: 10,
      },
      {
        actualHoursHn: 0,
        actualHoursRend: 30,
        effectiveHoursRend: 15,
        actualHoursForRend: 30,
        rendMinWeightedBase: 0.7 * 30,
        totalActualHours: 30,
      },
    ]);

    expect(totals.rendimiento).toBeCloseTo(0.6, 6);
    expect(totals.rendimientoMin).toBeCloseTo(0.725, 6);
    expect(totals.cumplimiento).toBeCloseTo(0.827586, 6);
  });

  it("devuelve vacios canonicos si no hay denominador", () => {
    const totals = calculateCollaboratorPerformanceTotals([
      {
        actualHoursHn: 12,
        actualHoursRend: 0,
        effectiveHoursRend: 0,
        actualHoursForRend: 0,
        rendMinWeightedBase: 0,
        totalActualHours: 12,
      },
    ]);

    expect(totals.rendimiento).toBeNull();
    expect(totals.rendimientoMin).toBeNull();
    expect(totals.cumplimiento).toBeNull();
  });
});

describe("formatTenureLabel", () => {
  it("formatea antiguedad corta, mensual y anual", () => {
    expect(formatTenureLabel(7)).toBe("7 d");
    expect(formatTenureLabel(61)).toBe("2 meses");
    expect(formatTenureLabel(425)).toBe("1 año, 1 mes");
  });

  it("devuelve vacio canonico para valores invalidos", () => {
    expect(formatTenureLabel(null)).toBeNull();
    expect(formatTenureLabel(-1)).toBeNull();
  });
});
