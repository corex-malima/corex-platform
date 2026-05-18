import { describe, expect, it } from "vitest";

import type { HarvestCurvePoint } from "@/lib/fenograma";

import {
  aggregateByWeek,
  toDailyPercentSeries,
  toWeeklyPercentSeries,
} from "../harvest-curve-aggregations";

function buildPoint(overrides: Partial<HarvestCurvePoint> & { eventDate: string; eventDay: number }): HarvestCurvePoint {
  return {
    dailyStems: 0,
    cumulativeStems: 0,
    observedCumulativeStems: null,
    projectedCumulativeStems: null,
    isProjected: false,
    dailyGreenKg: 0,
    cumulativeGreenKg: 0,
    dailyWeightPerStemG: null,
    cumulativeWeightPerStemG: null,
    ...overrides,
  };
}

describe("aggregateByWeek", () => {
  it("retorna [] si no hay puntos", () => {
    expect(aggregateByWeek([], "iso")).toEqual([]);
  });

  it("suma dailyStems por semana ISO", () => {
    // Semana ISO 11 de 2026: lun 2026-03-09 a dom 2026-03-15
    // Semana ISO 12 de 2026: lun 2026-03-16 a dom 2026-03-22
    const points: HarvestCurvePoint[] = [
      buildPoint({ eventDate: "2026-03-09", eventDay: 1, dailyStems: 10, cumulativeStems: 10, observedCumulativeStems: 10 }),
      buildPoint({ eventDate: "2026-03-12", eventDay: 4, dailyStems: 20, cumulativeStems: 30, observedCumulativeStems: 30 }),
      buildPoint({ eventDate: "2026-03-15", eventDay: 7, dailyStems: 30, cumulativeStems: 60, observedCumulativeStems: 60 }),
      buildPoint({ eventDate: "2026-03-16", eventDay: 8, dailyStems: 40, cumulativeStems: 100, observedCumulativeStems: 100 }),
      buildPoint({ eventDate: "2026-03-22", eventDay: 14, dailyStems: 50, cumulativeStems: 150, observedCumulativeStems: 150 }),
    ];

    const result = aggregateByWeek(points, "iso");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ weekKey: "2611", dailyStems: 60, cumulativeStems: 60, observedCumulativeStems: 60 });
    expect(result[1]).toMatchObject({ weekKey: "2612", dailyStems: 90, cumulativeStems: 150, observedCumulativeStems: 150 });
  });

  it("agrupa diferente con sunsat que con ISO en bordes", () => {
    // 2025-12-30 (martes): ISO = semana 1 de 2026; sunsat = última semana 2025
    // 2026-01-04 (domingo): ISO = semana 1 de 2026; sunsat = semana 1 de 2026
    const points: HarvestCurvePoint[] = [
      buildPoint({ eventDate: "2025-12-30", eventDay: 1, dailyStems: 10, cumulativeStems: 10 }),
      buildPoint({ eventDate: "2026-01-04", eventDay: 6, dailyStems: 20, cumulativeStems: 30 }),
    ];

    const iso = aggregateByWeek(points, "iso");
    expect(iso).toHaveLength(1);
    expect(iso[0].weekKey).toBe("2601");
    expect(iso[0].dailyStems).toBe(30);

    const sun = aggregateByWeek(points, "sunsat");
    expect(sun).toHaveLength(2);
    expect(sun[0].weekKey).not.toBe("2601");
    expect(sun[1].weekKey).toBe("2601");
  });

  it("marca isProjected=true si algun dia de la semana es proyectado", () => {
    const points: HarvestCurvePoint[] = [
      buildPoint({ eventDate: "2026-03-09", eventDay: 1, dailyStems: 10, isProjected: false }),
      buildPoint({ eventDate: "2026-03-12", eventDay: 4, dailyStems: 20, isProjected: true }),
    ];
    const result = aggregateByWeek(points, "iso");
    expect(result[0].isProjected).toBe(true);
  });

  it("preserva el último corte acumulado de la semana (mayor eventDay)", () => {
    const points: HarvestCurvePoint[] = [
      buildPoint({ eventDate: "2026-03-09", eventDay: 1, dailyStems: 10, cumulativeStems: 10, observedCumulativeStems: 10 }),
      buildPoint({ eventDate: "2026-03-15", eventDay: 7, dailyStems: 50, cumulativeStems: 60, observedCumulativeStems: 60 }),
    ];
    const result = aggregateByWeek(points, "iso");
    expect(result[0].observedCumulativeStems).toBe(60);
  });

  it("calcula peso/tallo semanal ponderado: (Σ greenKg × 1000) / Σ stems", () => {
    // Semana ISO 11: 10 tallos + 1.0 kg (100 g/tallo), 20 tallos + 4.0 kg (200 g/tallo)
    // Ponderado: (1.0 + 4.0) * 1000 / (10 + 20) = 5000 / 30 ≈ 166.67 g
    const points: HarvestCurvePoint[] = [
      buildPoint({ eventDate: "2026-03-09", eventDay: 1, dailyStems: 10, dailyGreenKg: 1.0 }),
      buildPoint({ eventDate: "2026-03-12", eventDay: 4, dailyStems: 20, dailyGreenKg: 4.0 }),
    ];
    const result = aggregateByWeek(points, "iso");
    expect(result[0].weeklyGreenKg).toBeCloseTo(5.0, 5);
    expect(result[0].weeklyWeightPerStemG).toBeCloseTo(166.666_67, 2);
  });

  it("peso/tallo semanal es null si no hay tallos", () => {
    const points: HarvestCurvePoint[] = [
      buildPoint({ eventDate: "2026-03-09", eventDay: 1, dailyStems: 0, dailyGreenKg: 0 }),
    ];
    const result = aggregateByWeek(points, "iso");
    expect(result[0].weeklyWeightPerStemG).toBe(null);
  });

  it("acumulado semanal es suma corriente de las semanas", () => {
    const points: HarvestCurvePoint[] = [
      buildPoint({ eventDate: "2026-03-09", eventDay: 1, dailyStems: 5 }),
      buildPoint({ eventDate: "2026-03-16", eventDay: 8, dailyStems: 7 }),
      buildPoint({ eventDate: "2026-03-23", eventDay: 15, dailyStems: 3 }),
    ];
    const result = aggregateByWeek(points, "iso");
    expect(result.map((week) => week.cumulativeStems)).toEqual([5, 12, 15]);
  });
});

describe("toDailyPercentSeries", () => {
  it("calcula porcentaje contra el total dado", () => {
    const points: HarvestCurvePoint[] = [
      buildPoint({ eventDate: "2026-03-09", eventDay: 1, dailyStems: 25 }),
      buildPoint({ eventDate: "2026-03-10", eventDay: 2, dailyStems: 75 }),
    ];
    const result = toDailyPercentSeries(points, 100);
    expect(result[0].percent).toBe(25);
    expect(result[1].percent).toBe(75);
  });

  it("devuelve 0 si total <= 0 (no divide por cero)", () => {
    const points: HarvestCurvePoint[] = [
      buildPoint({ eventDate: "2026-03-09", eventDay: 1, dailyStems: 10 }),
    ];
    expect(toDailyPercentSeries(points, 0)[0].percent).toBe(0);
    expect(toDailyPercentSeries(points, -5)[0].percent).toBe(0);
  });
});

describe("toWeeklyPercentSeries", () => {
  it("calcula porcentaje sobre puntos semanales", () => {
    const weekly = aggregateByWeek(
      [
        buildPoint({ eventDate: "2026-03-09", eventDay: 1, dailyStems: 20 }),
        buildPoint({ eventDate: "2026-03-16", eventDay: 8, dailyStems: 80 }),
      ],
      "iso",
    );
    const result = toWeeklyPercentSeries(weekly, 100);
    expect(result[0].percent).toBe(20);
    expect(result[1].percent).toBe(80);
  });
});
