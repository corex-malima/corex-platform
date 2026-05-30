import type {
  PoscosechaClasificacionRecipeInput,
  PoscosechaClasificacionResult,
  PoscosechaClasificacionResultOrderRow,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";

/**
 * Shape estructural mínimo de pesos seed por grado. Tanto la disponibilidad
 * capturada en el cliente (PoscosechaClasificacionAvailabilityRow) como la del
 * resultado del solver (PoscosechaClasificacionResultAvailabilityRow) lo
 * cumplen, de modo que el builder es agnóstico a la fuente.
 */
type SeedWeightRow = { grado: number; pesoTalloSeed: number };

/**
 * Builder ÚNICO del input de receta (fuente de verdad).
 *
 * IMPORTANTE: la receta que se muestra en la UI (modal por SKU) y la que se
 * exporta a PDF / XLSX DEBEN coincidir byte a byte. Para garantizarlo, todas
 * las rutas usan este builder con la MISMA semántica numérica:
 *  - `tallosNetos` por grado y `pedidoResuelto` se normalizan a entero >= 0.
 *  - El resto de campos (peso*, tallosMin/Max, tallosPromedioRamo,
 *    tallosAsignadosNetos) se pasan TAL CUAL los entrega el solver — sin
 *    redondear — porque así los consume la UI históricamente. Cualquier
 *    redondeo aquí desincronizaría la receta exportada respecto a la visible.
 */
function buildRecipeInputCore(
  row: PoscosechaClasificacionResultOrderRow,
  netStemValues: Record<string, number>,
  availabilityRows: readonly SeedWeightRow[],
): PoscosechaClasificacionRecipeInput | null {
  const grades = Object.entries(netStemValues)
    .map(([gradeLabel, value]) => {
      const grade = Number(gradeLabel);
      const tallosNetos = Math.max(Math.round(Number(value) || 0), 0);
      const availabilityRow = availabilityRows.find((item) => item.grado === grade);

      return {
        grado: Number.isFinite(grade) ? grade : 0,
        tallosNetos,
        pesoTalloSeed: availabilityRow?.pesoTalloSeed ?? 0,
      };
    })
    .filter((item) => item.grado > 0 && item.tallosNetos > 0);

  if (!grades.length || row.pedidoResuelto <= 0) {
    return null;
  }

  return {
    sku: row.sku,
    pedidoResuelto: Math.max(Math.round(row.pedidoResuelto), 0),
    pesoIdealBunch: row.pesoIdealBunch,
    pesoMinObjetivo: row.pesoMinObjetivo,
    pesoMaxObjetivo: row.pesoMaxObjetivo,
    tallosMin: row.tallosMin,
    tallosMax: row.tallosMax,
    tallosAsignadosNetos: row.tallosAsignadosNetos,
    tallosPromedioRamo: row.tallosPromedioRamo,
    grados: grades,
  };
}

/**
 * Variante usada por la UI (modal por SKU) cuando ya tiene a mano los tallos
 * netos y la disponibilidad. Delega en el core para mantener una sola lógica.
 */
export function buildRecipeInput(
  row: PoscosechaClasificacionResultOrderRow,
  netStemValues: Record<string, number>,
  availabilityRows: readonly SeedWeightRow[],
): PoscosechaClasificacionRecipeInput | null {
  return buildRecipeInputCore(row, netStemValues, availabilityRows);
}

/**
 * Fuente CANÓNICA del input de receta: extrae los tallos netos y los pesos seed
 * directamente del resultado del solver (snapshot consistente con la matriz de
 * tallos netos que produjo el resultado). La UI y las exportaciones (PDF / XLSX)
 * usan esta misma función para que la receta sea idéntica en todas partes.
 */
export function buildRecipeInputFromResult(
  result: PoscosechaClasificacionResult,
  row: PoscosechaClasificacionResultOrderRow,
): PoscosechaClasificacionRecipeInput | null {
  const netStemValues = result.netStemMatrix.rows.find((item) => item.sku === row.sku)?.values ?? null;
  if (!netStemValues) {
    return null;
  }

  return buildRecipeInputCore(row, netStemValues, result.availabilityRows);
}
