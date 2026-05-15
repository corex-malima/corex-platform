import { z } from "zod";

const SolverDateKey = z.enum([
  "fecha_1",
  "fecha_2",
  "fecha_3",
  "fecha_4",
  "fecha_5",
  "fecha_6",
  "fecha_7",
  "fecha_8",
  "fecha_9",
  "fecha_10",
]);
const Origin = z.enum(["GV", "APERTURA", "PRECLASIFICACION"]);

const orderRowSchema = z
  .object({
    skuId: z.string().trim().min(1),
    sku: z.string().trim().min(1),
  })
  .catchall(z.coerce.number().finite().min(0));

const availabilityRowSchema = z
  .object({
    grado: z.coerce.number().finite(),
    pesoTalloSeed: z.coerce.number().finite().min(0),
  })
  .catchall(z.coerce.number().finite().min(0));

export const solverRunInputSchema = z.object({
  orders: z.array(orderRowSchema).min(1, "Se requiere al menos una orden."),
  availability: z.array(availabilityRowSchema).min(1, "Se requiere al menos una fila de disponibilidad."),
  settings: z.object({
    desperdicio: z.coerce.number().finite().min(0).max(1),
  }),
  orderSlots: z
    .array(
      z.object({
        key: SolverDateKey,
        restriction: Origin.nullable(),
        restrictionMode: z.enum(["STRICT", "SOFT"]),
      }),
    )
    .optional(),
  lotSlots: z
    .array(
      z.object({
        key: SolverDateKey,
        lotDate: z.string().trim().nullable(),
        origin: Origin,
      }),
    )
    .optional(),
  dateSlots: z
    .array(
      z.object({
        key: SolverDateKey,
        restriction: Origin.nullable(),
        restrictionMode: z.enum(["STRICT", "SOFT"]),
        lotDate: z.string().trim().nullable(),
        origin: Origin,
      }),
    )
    .optional(),
});

export const solverRecipeInputSchema = z.object({
  grades: z.array(
    z.object({
      grado: z.coerce.number().finite(),
      tallosNetos: z.coerce.number().finite().min(0),
    }),
  ),
});
