import { describe, expect, it } from "vitest";

import {
  adminCatalogUpsertSchema,
  adminCatalogValidityPatchSchema,
  adminDomainUpsertSchema,
  adminGoalTargetUpsertSchema,
  adminMetricUpsertSchema,
  adminUnitUpsertSchema,
  formatZodIssue,
} from "@/lib/admin-masters-schemas";

describe("adminCatalogUpsertSchema", () => {
  it("accepts a valid group payload", () => {
    const result = adminCatalogUpsertSchema.safeParse({
      kind: "group",
      catalogCode: "metric_data_types",
      catalogName: "Tipos de dato métricos",
      domainCode: "production",
      isSystemCatalog: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid item payload", () => {
    const result = adminCatalogUpsertSchema.safeParse({
      kind: "item",
      catalogCode: "metric_data_types",
      itemCode: "decimal",
      itemLabelEs: "Decimal",
      displayOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid kind", () => {
    const result = adminCatalogUpsertSchema.safeParse({
      kind: "other",
      catalogCode: "x",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty catalogCode", () => {
    const result = adminCatalogUpsertSchema.safeParse({
      kind: "group",
      catalogCode: "",
      catalogName: "x",
      domainCode: "y",
    });
    expect(result.success).toBe(false);
  });
});

describe("adminCatalogValidityPatchSchema", () => {
  it("accepts group validity patch", () => {
    const result = adminCatalogValidityPatchSchema.safeParse({
      kind: "group",
      catalogCode: "metric_data_types",
      isValid: false,
    });
    expect(result.success).toBe(true);
  });

  it("requires itemCode for item kind", () => {
    const result = adminCatalogValidityPatchSchema.safeParse({
      kind: "item",
      catalogCode: "metric_data_types",
      isValid: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("adminDomainUpsertSchema", () => {
  it("accepts minimal payload", () => {
    const result = adminDomainUpsertSchema.safeParse({
      domainCode: "production",
      domainName: "Producción",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayOrder).toBe(0);
      expect(result.data.isValid).toBe(true);
    }
  });
});

describe("adminUnitUpsertSchema", () => {
  it("accepts unit with category", () => {
    const result = adminUnitUpsertSchema.safeParse({
      unitCode: "KG",
      unitName: "Kilogramo",
      unitSymbol: "kg",
      unitCategoryCode: "weight",
    });
    expect(result.success).toBe(true);
  });
});

describe("adminMetricUpsertSchema", () => {
  it("requires dataTypeCode and directionCode", () => {
    const ok = adminMetricUpsertSchema.safeParse({
      metricCode: "boxes_per_bed",
      metricName: "Cajas por cama",
      dataTypeCode: "decimal",
      directionCode: "higher_is_better",
    });
    expect(ok.success).toBe(true);

    const bad = adminMetricUpsertSchema.safeParse({
      metricCode: "boxes_per_bed",
      metricName: "Cajas por cama",
    });
    expect(bad.success).toBe(false);
  });
});

describe("adminGoalTargetUpsertSchema", () => {
  it("validates ISO date format", () => {
    const ok = adminGoalTargetUpsertSchema.safeParse({
      targetCode: "boxes_per_bed_target_q1",
      validFromDate: "2026-01-01",
    });
    expect(ok.success).toBe(true);

    const bad = adminGoalTargetUpsertSchema.safeParse({
      targetCode: "boxes_per_bed_target_q1",
      validFromDate: "01/01/2026",
    });
    expect(bad.success).toBe(false);
  });

  it("accepts numeric coercion for valueMin/valueMax", () => {
    const result = adminGoalTargetUpsertSchema.safeParse({
      targetCode: "x",
      validFromDate: "2026-01-01",
      valueMin: "12.5",
      valueMax: 20,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.valueMin).toBe(12.5);
      expect(result.data.valueMax).toBe(20);
    }
  });

  it("accepts string arrays for domainCodes/typeItemCodes", () => {
    const result = adminGoalTargetUpsertSchema.safeParse({
      targetCode: "x",
      validFromDate: "2026-01-01",
      domainCodes: ["postharvest", "field"],
      typeItemCodes: ["weekly"],
    });
    expect(result.success).toBe(true);
  });
});

describe("formatZodIssue", () => {
  it("returns descriptive path-prefixed messages", () => {
    const result = adminUnitUpsertSchema.safeParse({});
    if (!result.success) {
      const msg = formatZodIssue(result.error.issues);
      expect(msg).toMatch(/unitCode|Required/i);
    }
  });

  it("returns fallback for empty issues", () => {
    expect(formatZodIssue([])).toBe("Cuerpo invalido.");
  });
});
