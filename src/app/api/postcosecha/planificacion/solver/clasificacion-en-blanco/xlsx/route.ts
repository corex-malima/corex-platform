import { type NextRequest } from "next/server";
import * as XLSX from "xlsx";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { logEvent } from "@/lib/logger";
import { getRequestId } from "@/lib/request-id";
import { runClasificacionEnBlancoRecipeSolver } from "@/lib/postcosecha-clasificacion-en-blanco-runner";
import { buildRecipeInputFromResult } from "@/lib/postcosecha-clasificacion-recipe-input";
import type {
  PoscosechaClasificacionModeResult,
  PoscosechaClasificacionRecipeResult,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type XlsxRequestBody = {
  runs: PoscosechaClasificacionModeResult[];
};

type ResolvedRecipeEntry = {
  origen: string;
  sku: string;
  recipe: PoscosechaClasificacionRecipeResult | null;
};

/**
 * Resuelve la receta por SKU para cada corrida, reutilizando exactamente la
 * misma lógica que la exportación PDF (buildRecipeInputFromResult +
 * runClasificacionEnBlancoRecipeSolver). Solo se procesan los SKU con
 * pedidoResuelto > 0; el resto no forma parte de la orden de trabajo.
 */
async function resolveRecipesForRuns(
  runs: PoscosechaClasificacionModeResult[],
): Promise<ResolvedRecipeEntry[]> {
  const entries: ResolvedRecipeEntry[] = [];
  for (const run of runs) {
    if (!run.result) continue;
    const resolvedRows = run.result.orderRows.filter(
      (row) => Number(row.pedidoResuelto ?? 0) > 0,
    );
    const recipes = await Promise.all(
      resolvedRows.map(async (row) => {
        const input = buildRecipeInputFromResult(run.result!, row);
        if (!input) {
          return { origen: run.label, sku: row.sku, recipe: null };
        }
        try {
          const recipe = await runClasificacionEnBlancoRecipeSolver(input);
          return { origen: run.label, sku: row.sku, recipe };
        } catch {
          return { origen: run.label, sku: row.sku, recipe: null };
        }
      }),
    );
    entries.push(...recipes);
  }
  return entries;
}

function int(value: unknown): number {
  return Math.round(Number(value) || 0);
}

function dec2(value: unknown): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Construye el workbook con dos hojas que reflejan exactamente las dos tablas
 * de la receta en la orden de trabajo PDF:
 *  - "Combinaciones": qué bunches armar por receta.
 *  - "Consumo por grado": cuántos tallos de cada grado se consumen.
 * Cada fila lleva Origen (GV / Apertura / Preclasificacion) y SKU para filtrar.
 */
function buildRecipeWorkbook(entries: ResolvedRecipeEntry[]): XLSX.WorkBook {
  const combosHeader = [
    "Origen",
    "SKU",
    "Receta",
    "Cantidad",
    "Combinacion",
    "Tallos/bunch",
    "Peso/bunch (g)",
    "Dif. ideal (g)",
    "Estado",
  ];
  const combosRows: (string | number)[][] = [];

  const gradesHeader = [
    "Origen",
    "SKU",
    "Grado",
    "Tallos objetivo",
    "Tallos asignados",
    "Peso seed (g)",
    "Peso total (g)",
  ];
  const gradesRows: (string | number)[][] = [];

  for (const entry of entries) {
    const recipe = entry.recipe;
    if (!recipe) continue;

    for (const row of recipe.rows) {
      const combinacion = row.composicion
        .map((item) => `G${int(item.grado)} x ${int(item.tallos)}`)
        .join(", ");
      combosRows.push([
        entry.origen,
        entry.sku,
        row.recetaId,
        int(row.cantidad),
        combinacion || "—",
        int(row.tallosPorBunch),
        dec2(row.pesoPorBunch),
        dec2(row.difIdeal),
        row.estadoPeso,
      ]);
    }

    for (const row of recipe.gradeTotals) {
      gradesRows.push([
        entry.origen,
        entry.sku,
        int(row.grado),
        int(row.tallosObjetivo),
        int(row.tallosAsignados),
        dec2(row.pesoTalloSeed),
        dec2(row.pesoTotal),
      ]);
    }
  }

  const workbook = XLSX.utils.book_new();

  const combosSheet = XLSX.utils.aoa_to_sheet([combosHeader, ...combosRows]);
  combosSheet["!cols"] = [
    { wch: 16 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 42 },
    { wch: 13 },
    { wch: 14 },
    { wch: 13 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, combosSheet, "Combinaciones");

  const gradesSheet = XLSX.utils.aoa_to_sheet([gradesHeader, ...gradesRows]);
  gradesSheet["!cols"] = [
    { wch: 16 },
    { wch: 20 },
    { wch: 8 },
    { wch: 15 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, gradesSheet, "Consumo por grado");

  return workbook;
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as XlsxRequestBody;

    if (!Array.isArray(body.runs) || body.runs.length === 0) {
      return Response.json(
        { message: "Se requiere al menos una corrida para exportar." },
        { status: 400 },
      );
    }

    const entries = await resolveRecipesForRuns(body.runs);
    const workbook = buildRecipeWorkbook(entries);
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const datestamp = [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      "_",
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join("");

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="receta_orden_trabajo_clasificacion_en_blanco_${datestamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const requestId = getRequestId(request);
    logEvent("error", "xlsx.clasificacion.unexpected_error", {
      requestId,
      message: error instanceof Error ? error.message : String(error),
    });
    return handleApiError(error, "No se pudo generar el XLSX de Clasificacion en blanco.");
  }
}
