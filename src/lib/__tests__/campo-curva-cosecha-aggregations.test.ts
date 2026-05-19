import { describe, expect, it } from "vitest";

import { aggregateCycleDays, type DayRow } from "@/lib/campo-curva-cosecha";

function buildDay(overrides: Partial<DayRow> & { cycleKey: string; dayOffset: number }): DayRow {
  return {
    block: null,
    area: null,
    variety: null,
    spType: null,
    spDate: null,
    harvestStartDate: null,
    harvestEndDate: null,
    eventDate: "",
    dailyStems: 0,
    dailyGreenKg: 0,
    ...overrides,
  };
}

describe("aggregateCycleDays — casos vacíos y triviales", () => {
  it("devuelve estructura vacía para rows=[]", () => {
    const result = aggregateCycleDays([]);
    expect(result.points).toEqual([]);
    expect(result.cycles).toEqual([]);
    expect(result.summary.cycleCount).toBe(0);
    expect(result.summary.peakDay).toBe(null);
    expect(result.summary.maxDayOffset).toBe(0);
    expect(result.vegetative.cyclesConsidered).toBe(0);
    expect(result.vegetative.mean).toBe(null);
    expect(result.vegetative.median).toBe(null);
  });

  it("1 ciclo de 5 días — n=1 por día, sd=null, eventDay 1-indexed", () => {
    const rows: DayRow[] = [
      buildDay({ cycleKey: "C1", dayOffset: 0, dailyStems: 10, dailyGreenKg: 1 }),
      buildDay({ cycleKey: "C1", dayOffset: 1, dailyStems: 20, dailyGreenKg: 2 }),
      buildDay({ cycleKey: "C1", dayOffset: 2, dailyStems: 30, dailyGreenKg: 3 }),
      buildDay({ cycleKey: "C1", dayOffset: 3, dailyStems: 40, dailyGreenKg: 4 }),
      buildDay({ cycleKey: "C1", dayOffset: 4, dailyStems: 50, dailyGreenKg: 5 }),
    ];
    const result = aggregateCycleDays(rows);

    expect(result.cycles).toHaveLength(1);
    expect(result.points).toHaveLength(5);

    // eventDay debe ser 1-indexed (dayOffset 0 → eventDay 1)
    expect(result.points[0]!.eventDay).toBe(1);
    expect(result.points[4]!.eventDay).toBe(5);

    // n=1 en cada día, sd=null
    for (const point of result.points) {
      expect(point.stats.n).toBe(1);
      expect(point.stats.dailyStemsSd).toBe(null);
    }

    // En día 5 cumulative = 150 (suma 10+20+30+40+50)
    expect(result.points[4]!.cumulativeStems).toBe(150);

    // Total stems del ciclo
    expect(result.cycles[0]!.totalStems).toBe(150);
    expect(result.cycles[0]!.totalDays).toBe(5);
    expect(result.cycles[0]!.totalGreenKg).toBeCloseTo(15, 2);
  });
});

describe("aggregateCycleDays — agregación multi-ciclo", () => {
  it("2 ciclos coincidentes en días — calcula media, mediana, sd correctamente", () => {
    const rows: DayRow[] = [
      // Ciclo A: días 1-3 con [10, 20, 30]
      buildDay({ cycleKey: "A", dayOffset: 0, dailyStems: 10 }),
      buildDay({ cycleKey: "A", dayOffset: 1, dailyStems: 20 }),
      buildDay({ cycleKey: "A", dayOffset: 2, dailyStems: 30 }),
      // Ciclo B: días 1-3 con [20, 40, 60]
      buildDay({ cycleKey: "B", dayOffset: 0, dailyStems: 20 }),
      buildDay({ cycleKey: "B", dayOffset: 1, dailyStems: 40 }),
      buildDay({ cycleKey: "B", dayOffset: 2, dailyStems: 60 }),
    ];
    const result = aggregateCycleDays(rows);

    expect(result.points).toHaveLength(3);
    expect(result.summary.cycleCount).toBe(2);

    // Día 1: stems [10, 20]
    const day1 = result.points[0]!;
    expect(day1.eventDay).toBe(1);
    expect(day1.stats.n).toBe(2);
    expect(day1.stats.dailyStemsMean).toBe(15);
    expect(day1.stats.dailyStemsMedian).toBe(15);
    expect(day1.stats.dailyStemsSd).toBeCloseTo(7.07, 1); // sqrt((25+25)/1)

    // Día 3: cumulative [60, 120]
    const day3 = result.points[2]!;
    expect(day3.stats.n).toBe(2);
    expect(day3.cumulativeStems).toBe(90); // mediana de [60, 120]
    expect(day3.stats.cumulativeStemsMean).toBe(90);
  });

  it("ciclos con diferente longitud — n decrece en la cola", () => {
    const rows: DayRow[] = [
      // Ciclo A: 5 días
      ...Array.from({ length: 5 }, (_, i) =>
        buildDay({ cycleKey: "A", dayOffset: i, dailyStems: 100 }),
      ),
      // Ciclo B: 10 días
      ...Array.from({ length: 10 }, (_, i) =>
        buildDay({ cycleKey: "B", dayOffset: i, dailyStems: 200 }),
      ),
    ];
    const result = aggregateCycleDays(rows);

    expect(result.points).toHaveLength(10);
    // Día 1-5: n=2
    for (let d = 0; d < 5; d += 1) {
      expect(result.points[d]!.stats.n).toBe(2);
    }
    // Día 6-10: n=1 (solo B aporta)
    for (let d = 5; d < 10; d += 1) {
      expect(result.points[d]!.stats.n).toBe(1);
      expect(result.points[d]!.stats.dailyStemsSd).toBe(null);
    }
    expect(result.summary.maxDayOffset).toBe(10);
  });
});

describe("aggregateCycleDays — vegetativo", () => {
  it("excluye ciclos sin sp_date o sin harvest_start_date", () => {
    const rows: DayRow[] = [
      // Ciclo A: vegetativo válido (70 días)
      buildDay({
        cycleKey: "A",
        dayOffset: 0,
        dailyStems: 10,
        spDate: "2024-01-01",
        harvestStartDate: "2024-03-11", // 70 días después
      }),
      // Ciclo B: vegetativo válido (80 días)
      buildDay({
        cycleKey: "B",
        dayOffset: 0,
        dailyStems: 10,
        spDate: "2024-02-01",
        harvestStartDate: "2024-04-21", // 80 días después
      }),
      // Ciclo C: sp_date nulo — se excluye del vegetativo PERO sí aporta a la curva
      buildDay({
        cycleKey: "C",
        dayOffset: 0,
        dailyStems: 10,
        spDate: null,
        harvestStartDate: "2024-05-01",
      }),
    ];
    const result = aggregateCycleDays(rows);

    expect(result.cycles).toHaveLength(3);
    expect(result.summary.cycleCount).toBe(3);

    // Vegetativo: solo A y B aportan (n=2)
    expect(result.vegetative.cyclesConsidered).toBe(2);
    expect(result.vegetative.mean).toBe(75); // (70+80)/2
    expect(result.vegetative.median).toBe(75);

    // C tiene vegetativeDays=null pero está en la lista de cycles
    const cycleC = result.cycles.find((c) => c.cycleKey === "C")!;
    expect(cycleC.vegetativeDays).toBe(null);
    expect(cycleC.totalStems).toBe(10);
  });

  it("calcula desviación estándar del vegetativo con n>=2", () => {
    const rows: DayRow[] = [
      buildDay({
        cycleKey: "A",
        dayOffset: 0,
        spDate: "2024-01-01",
        harvestStartDate: "2024-03-11", // 70d
      }),
      buildDay({
        cycleKey: "B",
        dayOffset: 0,
        spDate: "2024-01-01",
        harvestStartDate: "2024-03-21", // 80d
      }),
      buildDay({
        cycleKey: "C",
        dayOffset: 0,
        spDate: "2024-01-01",
        harvestStartDate: "2024-03-31", // 90d
      }),
    ];
    const result = aggregateCycleDays(rows);

    expect(result.vegetative.cyclesConsidered).toBe(3);
    expect(result.vegetative.mean).toBe(80);
    expect(result.vegetative.median).toBe(80);
    // sd muestra de [70, 80, 90] = sqrt((100+0+100)/2) = sqrt(100) = 10
    expect(result.vegetative.sampleSd).toBe(10);
    expect(result.vegetative.min).toBe(70);
    expect(result.vegetative.max).toBe(90);
  });
});

describe("aggregateCycleDays — métricas ponderadas (sum/sum)", () => {
  it("dailyStems ponderado = suma cruda de stems del bucket", () => {
    const rows: DayRow[] = [
      buildDay({ cycleKey: "A", dayOffset: 0, dailyStems: 100 }),
      buildDay({ cycleKey: "B", dayOffset: 0, dailyStems: 200 }),
      buildDay({ cycleKey: "C", dayOffset: 0, dailyStems: 300 }),
    ];
    const result = aggregateCycleDays(rows);
    expect(result.points[0]!.weighted.dailyStems).toBe(600);
  });

  it("peso/tallo ponderado = sum(green_kg) / sum(stems) * 1000", () => {
    const rows: DayRow[] = [
      // Ciclo A: 10 tallos, 0.5 kg → 50 g/tallo
      buildDay({ cycleKey: "A", dayOffset: 0, dailyStems: 10, dailyGreenKg: 0.5 }),
      // Ciclo B: 30 tallos, 3.0 kg → 100 g/tallo
      buildDay({ cycleKey: "B", dayOffset: 0, dailyStems: 30, dailyGreenKg: 3.0 }),
    ];
    const result = aggregateCycleDays(rows);
    // Ponderado: sum(0.5 + 3.0) / sum(10 + 30) * 1000 = 3.5 / 40 * 1000 = 87.5
    expect(result.points[0]!.weighted.dailyWeightPerStemG).toBe(87.5);
    // Mediana sería simplemente (50 + 100) / 2 = 75 (mediana de dos = promedio)
    // El ponderado es DIFERENTE del mediano cuando los ciclos tienen volúmenes distintos.
  });

  it("percentOfTotal suma ≈ 100 a través de todos los días", () => {
    const rows: DayRow[] = [
      buildDay({ cycleKey: "A", dayOffset: 0, dailyStems: 100 }),
      buildDay({ cycleKey: "A", dayOffset: 1, dailyStems: 200 }),
      buildDay({ cycleKey: "B", dayOffset: 0, dailyStems: 50 }),
      buildDay({ cycleKey: "B", dayOffset: 1, dailyStems: 150 }),
    ];
    const result = aggregateCycleDays(rows);
    const sumPercent = result.points.reduce((s, p) => s + p.weighted.percentOfTotal, 0);
    expect(sumPercent).toBeCloseTo(100, 1);

    // Día 1: 150 de 500 → 30%; Día 2: 350 de 500 → 70%
    expect(result.points[0]!.weighted.percentOfTotal).toBe(30);
    expect(result.points[1]!.weighted.percentOfTotal).toBe(70);
  });

  it("cumulativeStems ponderado = suma de stems acumulados al final del día", () => {
    const rows: DayRow[] = [
      // A: día 1=10, día 2=20, día 3=30. Acumulados: 10, 30, 60.
      buildDay({ cycleKey: "A", dayOffset: 0, dailyStems: 10 }),
      buildDay({ cycleKey: "A", dayOffset: 1, dailyStems: 20 }),
      buildDay({ cycleKey: "A", dayOffset: 2, dailyStems: 30 }),
      // B: día 1=20, día 2=40, día 3=60. Acumulados: 20, 60, 120.
      buildDay({ cycleKey: "B", dayOffset: 0, dailyStems: 20 }),
      buildDay({ cycleKey: "B", dayOffset: 1, dailyStems: 40 }),
      buildDay({ cycleKey: "B", dayOffset: 2, dailyStems: 60 }),
    ];
    const result = aggregateCycleDays(rows);
    // Día 3: suma de cumulativeStems de A (60) + B (120) = 180
    expect(result.points[2]!.weighted.cumulativeStems).toBe(180);
  });

  it("summary expone total ponderado global y peso/tallo ponderado", () => {
    const rows: DayRow[] = [
      buildDay({ cycleKey: "A", dayOffset: 0, dailyStems: 100, dailyGreenKg: 5 }),
      buildDay({ cycleKey: "B", dayOffset: 0, dailyStems: 200, dailyGreenKg: 12 }),
    ];
    const result = aggregateCycleDays(rows);
    expect(result.summary.totalStemsAllCycles).toBe(300);
    expect(result.summary.totalGreenKgAllCycles).toBe(17);
    // Ponderado: 17000 / 300 = 56.6666...
    expect(result.summary.weightedWeightPerStemG).toBeCloseTo(56.7, 0);
  });
});

describe("aggregateCycleDays — peso/tallo y peak day", () => {
  it("calcula peso/tallo diario correctamente", () => {
    const rows: DayRow[] = [
      buildDay({ cycleKey: "A", dayOffset: 0, dailyStems: 10, dailyGreenKg: 0.5 }), // 50 g/tallo
      buildDay({ cycleKey: "A", dayOffset: 1, dailyStems: 20, dailyGreenKg: 1.0 }), // 50 g/tallo
    ];
    const result = aggregateCycleDays(rows);
    expect(result.points[0]!.dailyWeightPerStemG).toBe(50);
    expect(result.points[1]!.dailyWeightPerStemG).toBe(50);
  });

  it("dailyWeightPerStemG es null cuando dailyStems=0", () => {
    const rows: DayRow[] = [
      buildDay({ cycleKey: "A", dayOffset: 0, dailyStems: 0, dailyGreenKg: 0 }),
    ];
    const result = aggregateCycleDays(rows);
    expect(result.points[0]!.dailyWeightPerStemG).toBe(null);
  });

  it("identifica peak day como el día con mayor mediana de tallos", () => {
    const rows: DayRow[] = [
      // Día 1: tallos pequeños [10, 12]
      buildDay({ cycleKey: "A", dayOffset: 0, dailyStems: 10 }),
      buildDay({ cycleKey: "B", dayOffset: 0, dailyStems: 12 }),
      // Día 2: PICO [100, 110]
      buildDay({ cycleKey: "A", dayOffset: 1, dailyStems: 100 }),
      buildDay({ cycleKey: "B", dayOffset: 1, dailyStems: 110 }),
      // Día 3: descenso [50, 60]
      buildDay({ cycleKey: "A", dayOffset: 2, dailyStems: 50 }),
      buildDay({ cycleKey: "B", dayOffset: 2, dailyStems: 60 }),
    ];
    const result = aggregateCycleDays(rows);
    expect(result.summary.peakDay).toBe(2); // 1-indexed
    expect(result.summary.peakMedianStems).toBe(105);
  });
});
