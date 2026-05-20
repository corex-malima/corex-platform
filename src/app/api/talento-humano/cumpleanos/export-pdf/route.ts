import { type NextRequest } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { logEvent } from "@/lib/logger";
import { getRequestId } from "@/lib/request-id";
import {
  getCumpleanosData,
  MONTH_LABELS,
  normalizeCumpleanosFilters,
  type CumpleanosRow,
} from "@/lib/talento-humano-cumpleanos";
import {
  generateCanonicalPdf,
  pdfBufferToResponse,
  PdfCompileError,
} from "@pdf-canon/scripts/generate_pdf_service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Escape LaTeX especiales. Idéntico al de export-pdf/seguimientos.
function tex(value: unknown): string {
  return String(value ?? "")
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/#/g, "\\#")
    .replace(/\$/g, "\\$")
    .replace(/%/g, "\\%")
    .replace(/&/g, "\\&")
    .replace(/_/g, "\\_")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/~/g, "\\textasciitilde{}");
}

function titleCaseName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("es-EC")
    .replace(/\p{L}+/gu, (word) => word.charAt(0).toLocaleUpperCase("es-EC") + word.slice(1));
}

/**
 * Resuelve el subtítulo del documento a partir del filtro `months`:
 *  - vacio o "all"      → "Todos los meses"
 *  - un mes ("3")       → "Marzo"
 *  - varios ("3,4,12")  → "Marzo, Abril, Diciembre"
 */
function resolveMonthLabel(monthsParam: string | null): string {
  if (!monthsParam || monthsParam.trim() === "" || monthsParam.trim() === "all") {
    return "Todos los meses";
  }
  const codes = monthsParam
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 12);
  if (codes.length === 0) return "Todos los meses";
  const labels = codes
    .sort((a, b) => a - b)
    .map((m) => MONTH_LABELS[m - 1] ?? `Mes ${m}`);
  return labels.join(", ");
}

function buildDataTex(
  rows: CumpleanosRow[],
  monthLabel: string,
  exportDate: Date,
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const docCode = `TTHH-CUM-${exportDate.getFullYear()}${pad(exportDate.getMonth() + 1)}${pad(exportDate.getDate())}`;
  const docDate = `${exportDate.getFullYear()}-${pad(exportDate.getMonth() + 1)}-${pad(exportDate.getDate())}`;

  // Ordenamos por mes y dia (ascendente) para que el listado salga cronologico.
  // El loader ya ordena asi pero re-asegura por si llegan rows manipuladas.
  const sortedRows = [...rows].sort((a, b) => {
    if (a.birthMonth !== b.birthMonth) return a.birthMonth - b.birthMonth;
    if (a.birthDay !== b.birthDay) return a.birthDay - b.birthDay;
    return a.personName.localeCompare(b.personName, "es-EC");
  });

  // Caja vacía para marcar con bolígrafo al imprimir. \fbox + \rule da un
  // cuadrado limpio sin depender de amssymb/pifont (no cargados en canon.cls).
  const checkbox = "\\fbox{\\rule{0pt}{1.8ex}\\rule{1.8ex}{0pt}}";

  const tableRows = sortedRows.map((row) => {
    const nombre = tex(titleCaseName(row.personName));
    const area = tex(row.areaName ?? row.areaId ?? "-");
    return `  ${nombre} & ${area} & ${checkbox} & ${checkbox} \\\\`;
  }).join("\n");

  const emptyRow = sortedRows.length === 0
    ? `  \\multicolumn{4}{c}{\\textit{Sin cumplea\\~nos para los filtros aplicados.}} \\\\`
    : "";

  // Total formateado al pie. Si solo hay 1 ciclo de meses, mostramos el
  // conteo plano; si hay varios meses, agregamos un sub-conteo por mes.
  const totalLine = `\\NoteInline{Total:} ${sortedRows.length} colaborador(es).`;

  return `\\SetDocCode{${tex(docCode)}}
\\SetDocDate{${tex(docDate)}}

\\newcommand{\\CumpleanosBody}{%
  \\section*{Cumplea\\~nos --- ${tex(monthLabel)}}

  \\begin{center}
  \\begin{longtable}{@{} p{8.0cm} p{5.6cm} c c @{}}
    \\caption{Lista de cumplea\\~nos para imprimir y marcar a mano.} \\\\
    \\toprule
    \\textbf{Nombre} & \\textbf{\\'Area} & \\textbf{Cupcake} & \\textbf{Desayuno} \\\\
    \\midrule
    \\endfirsthead
    \\toprule
    \\textbf{Nombre} & \\textbf{\\'Area} & \\textbf{Cupcake} & \\textbf{Desayuno} \\\\
    \\midrule
    \\endhead
    \\midrule
    \\multicolumn{4}{r}{\\small\\itshape Contin\\'ua\\ldots} \\\\
    \\endfoot
    \\bottomrule
    \\endlastfoot
${tableRows}${emptyRow}
  \\end{longtable}
  \\end{center}

  ${totalLine}
}
`;
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const sp = request.nextUrl.searchParams;
    const monthsParam = sp.get("months");

    const filters = normalizeCumpleanosFilters({
      corteDate: sp.get("corteDate") ?? undefined,
      months: monthsParam ?? undefined,
      area: sp.get("area") ?? undefined,
      jobClassification: sp.get("jobClassification") ?? undefined,
      jobTitle: sp.get("jobTitle") ?? undefined,
      q: sp.get("q") ?? undefined,
    });

    const data = await getCumpleanosData(filters);
    const monthLabel = resolveMonthLabel(monthsParam);
    const exportDate = new Date();
    const dataTexContent = buildDataTex(data.rows, monthLabel, exportDate);

    const { pdf } = await generateCanonicalPdf({
      templateName: "tthh_cumpleanos",
      dataTexContent,
      jobId: crypto.randomUUID(),
      passes: 2,
    });

    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${exportDate.getFullYear()}${pad(exportDate.getMonth() + 1)}${pad(exportDate.getDate())}`;
    return pdfBufferToResponse(pdf, `cumpleanos_${stamp}.pdf`);
  } catch (error) {
    if (error instanceof PdfCompileError) {
      logEvent("error", "pdf.tthh_cumpleanos.latex_compile_error", {
        requestId: getRequestId(request),
        buildLogTail: error.buildLog.slice(-1200),
        jobId: error.jobId,
      });
      return Response.json({ message: "Error al compilar el PDF." }, { status: 500 });
    }
    return handleApiError(error, "No se pudo exportar el PDF de cumpleaños.");
  }
}
