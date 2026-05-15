import type {
  PoscosechaClasificacionRecipeInput,
  PoscosechaClasificacionResult,
  PoscosechaClasificacionResultOrderRow,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";

function toInt(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(Math.round(parsed), 0) : 0;
}

function toNum(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

export function buildRecipeInputFromResult(
  result: PoscosechaClasificacionResult,
  row: PoscosechaClasificacionResultOrderRow,
): PoscosechaClasificacionRecipeInput | null {
  const netStemValues = result.netStemMatrix.rows.find((item) => item.sku === row.sku)?.values ?? null;
  if (!netStemValues) {
    return null;
  }

  const grades = Object.entries(netStemValues)
    .map(([gradeLabel, value]) => {
      const grade = Number(gradeLabel);
      const tallosNetos = Math.max(Math.round(Number(value) || 0), 0);
      const availabilityRow = result.availabilityRows.find((item) => item.grado === grade);

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
    pedidoResuelto: Math.max(toInt(row.pedidoResuelto), 0),
    pesoIdealBunch: toNum(row.pesoIdealBunch),
    pesoMinObjetivo: toNum(row.pesoMinObjetivo),
    pesoMaxObjetivo: toNum(row.pesoMaxObjetivo),
    tallosMin: Math.max(toInt(row.tallosMin), 0),
    tallosMax: Math.max(toInt(row.tallosMax), 0),
    tallosAsignadosNetos: Math.max(toInt(row.tallosAsignadosNetos), 0),
    tallosPromedioRamo: toNum(row.tallosPromedioRamo),
    grados: grades,
  };
}
