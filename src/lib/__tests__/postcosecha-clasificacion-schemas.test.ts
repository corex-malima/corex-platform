import { describe, expect, it } from "vitest";

import { solverRunInputSchema } from "@/lib/postcosecha-clasificacion-schemas";

const minimalOrders = [
  { skuId: "SKU-1", sku: "GYP XLE 50", fecha_1: 100, fecha_2: 0, fecha_3: 0, fecha_4: 0, fecha_5: 0 },
];

const minimalAvailability = [
  { grado: 50, pesoTalloSeed: 25, fecha_1: 200, fecha_2: 0, fecha_3: 0, fecha_4: 0, fecha_5: 0 },
];

describe("solverRunInputSchema", () => {
  it("accepts a minimal valid run", () => {
    const result = solverRunInputSchema.safeParse({
      orders: minimalOrders,
      availability: minimalAvailability,
      settings: { desperdicio: 0.05 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty orders", () => {
    const result = solverRunInputSchema.safeParse({
      orders: [],
      availability: minimalAvailability,
      settings: { desperdicio: 0.05 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty availability", () => {
    const result = solverRunInputSchema.safeParse({
      orders: minimalOrders,
      availability: [],
      settings: { desperdicio: 0.05 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects desperdicio out of [0,1]", () => {
    const tooHigh = solverRunInputSchema.safeParse({
      orders: minimalOrders,
      availability: minimalAvailability,
      settings: { desperdicio: 1.5 },
    });
    expect(tooHigh.success).toBe(false);

    const negative = solverRunInputSchema.safeParse({
      orders: minimalOrders,
      availability: minimalAvailability,
      settings: { desperdicio: -0.1 },
    });
    expect(negative.success).toBe(false);
  });

  it("validates orderSlots restriction values", () => {
    const ok = solverRunInputSchema.safeParse({
      orders: minimalOrders,
      availability: minimalAvailability,
      settings: { desperdicio: 0.05 },
      orderSlots: [
        { key: "fecha_1", restriction: "GV", restrictionMode: "STRICT" },
        { key: "fecha_2", restriction: null, restrictionMode: "SOFT" },
      ],
    });
    expect(ok.success).toBe(true);

    const bad = solverRunInputSchema.safeParse({
      orders: minimalOrders,
      availability: minimalAvailability,
      settings: { desperdicio: 0.05 },
      orderSlots: [{ key: "fecha_1", restriction: "OTHER", restrictionMode: "STRICT" }],
    });
    expect(bad.success).toBe(false);
  });

  it("coerces stringified numbers in orders/availability", () => {
    const result = solverRunInputSchema.safeParse({
      orders: [
        { skuId: "S1", sku: "X", fecha_1: "100", fecha_2: 0, fecha_3: 0, fecha_4: 0, fecha_5: 0 },
      ],
      availability: minimalAvailability,
      settings: { desperdicio: 0.05 },
    });
    expect(result.success).toBe(true);
  });
});
