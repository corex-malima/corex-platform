import { type NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { logEvent } from "@/lib/logger";
import { runClasificacionEnBlancoRecipeSolver } from "@/lib/postcosecha-clasificacion-en-blanco-runner";
import { buildRecipeInputFromResult } from "@/lib/postcosecha-clasificacion-recipe-input";
import { getRequestId } from "@/lib/request-id";
import { buildOrdenTrabajoDataTex } from "@/lib/postcosecha-clasificacion-pdf-builder";
import type { PoscosechaClasificacionRecipeResult } from "@/lib/postcosecha-clasificacion-en-blanco-types";
import { generateClasificacionFallbackPdf } from "@/lib/postcosecha-clasificacion-pdf-fallback";
import type { PoscosechaClasificacionModeResult } from "@/lib/postcosecha-clasificacion-en-blanco-types";
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

type FallbackFlowRow = {
  label: string;
  incoming: number;
  resolved: number;
  remaining: number;
  compliance: number;
};

type FallbackRecipeEntry = {
  sku: string;
  recipe: PoscosechaClasificacionRecipeResult | null;
};

type FallbackRunRow = PoscosechaClasificacionModeResult & {
  flow: FallbackFlowRow;
  recipes: FallbackRecipeEntry[];
};

async function buildFallbackRuns(runs: PoscosechaClasificacionModeResult[]): Promise<FallbackRunRow[]> {
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

  let parsedBody: PdfRequestBody | null = null;

  try {
    const body = (await request.json()) as PdfRequestBody;
    parsedBody = body;

    if (!Array.isArray(body.runs) || body.runs.length === 0) {
      return Response.json({ message: "Se requiere al menos una corrida para exportar." }, { status: 400 });
    }

    const exportDate = new Date();
    const enrichedRuns = await buildFallbackRuns(body.runs);
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
    if (error instanceof PdfCompileError) {
      logEvent("error", "pdf.clasificacion.latex_compile_error", {
        requestId: getRequestId(request),
        buildLogTail: error.buildLog.slice(-1000),
        jobId: error.jobId,
      });
      try {
        const exportDate = new Date();
        const fallbackRuns = await buildFallbackRuns(parsedBody?.runs ?? []);
        const fallbackPdf = await generateClasificacionFallbackPdf(fallbackRuns, exportDate);

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

        return pdfBufferToResponse(
          fallbackPdf,
          `orden_trabajo_clasificacion_en_blanco_${datestamp}.pdf`,
        );
      } catch (fallbackError) {
        return handleApiError(fallbackError, "No se pudo generar el PDF alterno de Clasificacion en blanco.");
      }
    }
    if (error instanceof PdfTemplateNotFoundError) {
      return Response.json({ message: error.message }, { status: 500 });
    }
    return handleApiError(error, "No se pudo generar el PDF de Clasificacion en blanco.");
  }
}
