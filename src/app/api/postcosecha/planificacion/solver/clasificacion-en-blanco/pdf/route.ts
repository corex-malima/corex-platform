import { type NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { logEvent } from "@/lib/logger";
import { runClasificacionEnBlancoRecipeSolver } from "@/lib/postcosecha-clasificacion-en-blanco-runner";
import { buildRecipeInputFromResult } from "@/lib/postcosecha-clasificacion-recipe-input";
import { getRequestId } from "@/lib/request-id";
import { buildOrdenTrabajoDataTex } from "@/lib/postcosecha-clasificacion-pdf-builder";
import type {
  PoscosechaClasificacionModeResult,
  PoscosechaClasificacionRecipeResult,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";
import {
  generateCanonicalPdf,
  pdfBufferToResponse,
  PdfCompileError,
  PdfTemplateNotFoundError,
} from "@pdf-canon/scripts/generate_pdf_service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PdfRequestBody = {
  runs: PoscosechaClasificacionModeResult[];
};

type EnrichedFlowRow = {
  label: string;
  incoming: number;
  resolved: number;
  remaining: number;
  compliance: number;
};

type EnrichedRecipeEntry = {
  sku: string;
  recipe: PoscosechaClasificacionRecipeResult | null;
};

type EnrichedRunRow = PoscosechaClasificacionModeResult & {
  flow: EnrichedFlowRow;
  recipes: EnrichedRecipeEntry[];
};

/**
 * Enriquece cada corrida con el flujo agregado y las recetas resueltas por SKU,
 * usadas por el builder LaTeX para componer la orden de trabajo.
 */
async function enrichRunsForPdf(runs: PoscosechaClasificacionModeResult[]): Promise<EnrichedRunRow[]> {
  return Promise.all(
    runs.map(async (run) => {
      const incoming = Number(run.result?.stage1Summary?.pedido_bunches_total ?? 0);
      const resolved = Number(run.result?.stage1Summary?.pedido_bunches_resuelto ?? 0);
      const remaining = Number(run.result?.stage1Summary?.ajuste_bunches_total ?? Math.max(incoming - resolved, 0));
      const compliance = incoming > 0 ? resolved / incoming : 1;

      if (!run.result) {
        return {
          ...run,
          flow: { label: run.label, incoming, resolved, remaining, compliance },
          recipes: [],
        };
      }

      const recipes = await Promise.all(
        run.result.orderRows
          .filter((row) => Number(row.pedidoResuelto ?? 0) > 0)
          .map(async (row) => {
            const input = buildRecipeInputFromResult(run.result!, row);
            if (!input) {
              return { sku: row.sku, recipe: null };
            }
            try {
              const recipe = await runClasificacionEnBlancoRecipeSolver(input);
              return { sku: row.sku, recipe };
            } catch {
              return { sku: row.sku, recipe: null };
            }
          }),
      );

      return {
        ...run,
        flow: { label: run.label, incoming, resolved, remaining, compliance },
        recipes,
      };
    }),
  );
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const body = (await request.json()) as PdfRequestBody;

    if (!Array.isArray(body.runs) || body.runs.length === 0) {
      return Response.json({ message: "Se requiere al menos una corrida para exportar." }, { status: 400 });
    }

    const exportDate = new Date();
    const enrichedRuns = await enrichRunsForPdf(body.runs);
    const dataTexContent = buildOrdenTrabajoDataTex(enrichedRuns, exportDate);

    const { pdf } = await generateCanonicalPdf({
      templateName: "orden_trabajo_clasificacion",
      dataTexContent,
      jobId: crypto.randomUUID(),
    });

    const pad = (n: number) => String(n).padStart(2, "0");
    const datestamp = [
      exportDate.getFullYear(),
      pad(exportDate.getMonth() + 1),
      pad(exportDate.getDate()),
      "_",
      pad(exportDate.getHours()),
      pad(exportDate.getMinutes()),
      pad(exportDate.getSeconds()),
    ].join("");

    return pdfBufferToResponse(pdf, `orden_trabajo_clasificacion_en_blanco_${datestamp}.pdf`);
  } catch (error) {
    const requestId = getRequestId(request);
    if (error instanceof PdfCompileError) {
      logEvent("error", "pdf.clasificacion.latex_compile_error", {
        requestId,
        buildLogTail: error.buildLog.slice(-1500),
        jobId: error.jobId,
      });
      return Response.json(
        {
          message: "Error al compilar el PDF de Clasificacion en blanco. Revise los logs del servidor para el detalle del error LaTeX.",
          requestId,
        },
        { status: 500 },
      );
    }
    if (error instanceof PdfTemplateNotFoundError) {
      return Response.json({ message: error.message, requestId }, { status: 500 });
    }
    logEvent("error", "pdf.clasificacion.unexpected_error", {
      requestId,
      message: error instanceof Error ? error.message : String(error),
    });
    return handleApiError(error, "No se pudo generar el PDF de Clasificacion en blanco.");
  }
}
