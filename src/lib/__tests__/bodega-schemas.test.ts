import { describe, expect, it } from "vitest";

import {
  bodegaCategoryInputSchema,
  bodegaPresentationInputSchema,
  bodegaProductInputSchema,
  bodegaUnitInputSchema,
} from "@/lib/bodega-schemas";

describe("bodegaCategoryInputSchema", () => {
  it("accepts a family with no parent", () => {
    const result = bodegaCategoryInputSchema.safeParse({
      code: "FERT",
      name: "Fertilizantes",
      level: "family",
      parentCategoryId: null,
      sortOrder: 1,
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid level", () => {
    const result = bodegaCategoryInputSchema.safeParse({
      code: "X",
      name: "X",
      level: "category",
      sortOrder: 0,
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it("coerces sortOrder from string", () => {
    const result = bodegaCategoryInputSchema.safeParse({
      code: "X",
      name: "X",
      level: "subfamily",
      sortOrder: "5",
      isActive: false,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sortOrder).toBe(5);
  });
});

describe("bodegaUnitInputSchema", () => {
  it("accepts all 4 dimensions", () => {
    for (const dimension of ["Unidad", "Peso", "Volumen", "Longitud"] as const) {
      const r = bodegaUnitInputSchema.safeParse({
        code: "X",
        name: "X",
        symbol: "x",
        dimension,
        decimalPrecision: 2,
        isActive: true,
      });
      expect(r.success).toBe(true);
    }
  });

  it("rejects decimal precision out of range", () => {
    const r = bodegaUnitInputSchema.safeParse({
      code: "X",
      name: "X",
      symbol: "x",
      dimension: "Peso",
      decimalPrecision: 99,
      isActive: true,
    });
    expect(r.success).toBe(false);
  });
});

describe("bodegaProductInputSchema", () => {
  it("accepts product with empty assignments", () => {
    const r = bodegaProductInputSchema.safeParse({
      code: "P-001",
      productName: "Producto 1",
      categoryId: "cat-1",
      baseUnitId: "unit-1",
      isActive: true,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.assignments).toEqual([]);
  });

  it("validates assignment shape", () => {
    const r = bodegaProductInputSchema.safeParse({
      code: "P-001",
      productName: "Producto 1",
      categoryId: "cat-1",
      baseUnitId: "unit-1",
      isActive: true,
      assignments: [{ activityId: "FM01", branchOrder: 1 }],
    });
    expect(r.success).toBe(true);
  });
});

describe("bodegaPresentationInputSchema", () => {
  it("requires positive factor", () => {
    const ok = bodegaPresentationInputSchema.safeParse({
      productId: "P-001",
      presentationCode: "BAG-25",
      presentationLabel: "Saco 25kg",
      factorToBase: 25,
      isActive: true,
    });
    expect(ok.success).toBe(true);

    const bad = bodegaPresentationInputSchema.safeParse({
      productId: "P-001",
      presentationCode: "BAG-25",
      presentationLabel: "Saco 25kg",
      factorToBase: 0,
      isActive: true,
    });
    expect(bad.success).toBe(false);
  });
});
