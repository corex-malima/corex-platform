import { z } from "zod";

// ── Categorías ───────────────────────────────────────────────────────────────

export const bodegaCategoryInputSchema = z.object({
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(160),
  level: z.enum(["family", "subfamily"]),
  parentCategoryId: z.string().trim().min(1).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(99999),
  description: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean(),
  changeReason: z.string().trim().max(200).nullable().optional(),
});

// ── Unidades ─────────────────────────────────────────────────────────────────

export const bodegaUnitInputSchema = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(120),
  symbol: z.string().trim().max(16).default(""),
  dimension: z.enum(["Unidad", "Peso", "Volumen", "Longitud"]),
  decimalPrecision: z.coerce.number().int().min(0).max(6),
  isActive: z.boolean(),
  changeReason: z.string().trim().max(200).nullable().optional(),
});

// ── Productos ────────────────────────────────────────────────────────────────
// El input de productos es complejo (incluye assignments), validación
// permisiva pero con bordes razonables; la lib hace validación de negocio.

export const bodegaProductInputSchema = z.object({
  code: z.string().trim().min(1).max(64),
  productName: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).nullable().optional(),
  categoryId: z.string().trim().min(1),
  baseUnitId: z.string().trim().min(1),
  activeComponentMode: z.string().trim().min(1).optional(),
  activeComponentName: z.string().trim().max(200).nullable().optional(),
  isActive: z.boolean(),
  assignments: z
    .array(
      z.object({
        activityId: z.string().trim().min(1),
        branchOrder: z.coerce.number().int().min(0).max(99999),
      }),
    )
    .default([]),
  changeReason: z.string().trim().max(200).nullable().optional(),
});

// ── Presentaciones ───────────────────────────────────────────────────────────

export const bodegaPresentationInputSchema = z.object({
  productId: z.string().trim().min(1),
  presentationCode: z.string().trim().min(1).max(64),
  presentationLabel: z.string().trim().min(1).max(200),
  factorToBase: z.coerce.number().finite().positive(),
  decimalPrecision: z.coerce.number().int().min(0).max(6).optional(),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean(),
  changeReason: z.string().trim().max(200).nullable().optional(),
});
