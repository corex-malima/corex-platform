import { formatDecimal, formatInteger, formatPercent } from "@/shared/lib/format";
import type {
  PoscosechaClasificacionModeResult,
  PoscosechaClasificacionRecipeResult,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";

function toLatexSafe(value: unknown): string {
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

function int(value: number | null | undefined): string {
  return value == null ? "{---}" : toLatexSafe(formatInteger(value));
}

function dec(value: number | null | undefined): string {
  return value == null ? "{---}" : toLatexSafe(formatDecimal(value));
}

function pct(value: number | null | undefined, input: "ratio" | "percent" = "ratio"): string {
  return value == null ? "{---}" : toLatexSafe(formatPercent(value, { input }));
}

type PdfRecipeEntry = {
  sku: string;
  recipe: PoscosechaClasificacionRecipeResult | null;
};

type PdfRun = PoscosechaClasificacionModeResult & {
  recipes?: PdfRecipeEntry[];
};

function buildFlowSummaryRows(runs: PdfRun[]) {
  const rows = runs.map((run, index) => {
    const incoming = Number(run.result?.stage1Summary?.pedido_bunches_total ?? 0);
    const resolved = Number(run.result?.stage1Summary?.pedido_bunches_resuelto ?? 0);
    const remaining = Number(run.result?.stage1Summary?.ajuste_bunches_total ?? Math.max(incoming - resolved, 0));
    const compliance = incoming > 0 ? resolved / incoming : 1;
    return {
      step: `${index + 1}. ${run.label}`,
      incoming,
      resolved,
      remaining,
      compliance,
    };
  });

  const totalIncoming = rows.reduce((sum, row) => sum + row.incoming, 0);
  const totalResolved = rows.reduce((sum, row) => sum + row.resolved, 0);
  const totalRemaining = rows.reduce((sum, row) => sum + row.remaining, 0);
  const overallCompliance = totalIncoming > 0 ? totalResolved / totalIncoming : 1;

  return {
    rows,
    totalIncoming,
    totalResolved,
    totalRemaining,
    overallCompliance,
  };
}

function buildRecipeSection(recipes: PdfRecipeEntry[]): string[] {
  const lines: string[] = [
    "",
    "\\subsection*{Receta operativa por SKU resuelto}",
    "\\begin{ParrafoMetodologico}",
    "Aqui se muestra la orden de trabajo real por SKU, incluyendo sus recetas activas y el consumo por grado que se usara en produccion.",
    "\\end{ParrafoMetodologico}",
  ];

  for (const recipeEntry of recipes) {
    const recipe = recipeEntry.recipe;
    lines.push("", `\\subsubsection*{SKU ${toLatexSafe(recipeEntry.sku)}}`);

    if (!recipe) {
      lines.push(
        "\\begin{ObservationBox}[Sin receta disponible]",
        "No se pudo construir la receta para este SKU en la exportacion.",
        "\\end{ObservationBox}",
      );
      continue;
    }

    const summary = recipe.summary;
    lines.push(
      "\\begin{ObservationBox}[Resumen de receta]",
      "{\\small "
      + `Bunches resueltos: ${int(summary.bunchesResueltos)}\\quad`
      + `Recetas activas: ${int(summary.recetasUsadas)}\\quad`
      + `Peso promedio real: ${dec(summary.pesoPromedioReal)}~g\\quad`
      + `Estado: ${toLatexSafe(summary.status)}`
      + "}",
      "\\end{ObservationBox}",
      "",
      "\\begin{center}",
      "{\\footnotesize",
      "\\begin{longtable}{@{}r p{5.4cm} r r r p{2.8cm}@{}}",
      "\\caption{Combinaciones activas por receta} \\\\",
      "\\toprule",
      "\\textbf{Cantidad} & \\textbf{Combinacion} & \\textbf{Tallos} & \\textbf{Peso/bunch} & \\textbf{Dif. ideal} & \\textbf{Estado} \\\\",
      "\\midrule",
      "\\endfirsthead",
      "\\toprule",
      "\\textbf{Cantidad} & \\textbf{Combinacion} & \\textbf{Tallos} & \\textbf{Peso/bunch} & \\textbf{Dif. ideal} & \\textbf{Estado} \\\\",
      "\\midrule",
      "\\endhead",
      "\\midrule",
      "\\multicolumn{6}{r}{\\small\\itshape Continua\\ldots} \\\\",
      "\\endfoot",
      "\\bottomrule",
      "\\endlastfoot",
    );

    for (const row of recipe.rows) {
      const combinacion = row.composicion
        .map((item) => `G${toLatexSafe(item.grado)} x ${int(item.tallos)}`)
        .join(", ");
      lines.push(
        `${int(row.cantidad)} & ${toLatexSafe(combinacion || "---")} & ${int(row.tallosPorBunch)} & ${dec(row.pesoPorBunch)} & ${dec(row.difIdeal)} & ${toLatexSafe(row.estadoPeso)} \\\\`,
      );
    }

    lines.push("\\end{longtable}", "}", "\\end{center}");

    lines.push(
      "",
      "\\begin{center}",
      "{\\footnotesize",
      "\\begin{longtable}{@{}r r r r r@{}}",
      "\\caption{Consumo por grado de la receta final} \\\\",
      "\\toprule",
      "\\textbf{Grado} & \\textbf{Objetivo} & \\textbf{Asignado} & \\textbf{Peso seed} & \\textbf{Peso total} \\\\",
      "\\midrule",
      "\\endfirsthead",
      "\\toprule",
      "\\textbf{Grado} & \\textbf{Objetivo} & \\textbf{Asignado} & \\textbf{Peso seed} & \\textbf{Peso total} \\\\",
      "\\midrule",
      "\\endhead",
      "\\midrule",
      "\\multicolumn{5}{r}{\\small\\itshape Continua\\ldots} \\\\",
      "\\endfoot",
      "\\bottomrule",
      "\\endlastfoot",
    );

    for (const row of recipe.gradeTotals) {
      lines.push(
        `${int(row.grado)} & ${int(row.tallosObjetivo)} & ${int(row.tallosAsignados)} & ${dec(row.pesoTalloSeed)} & ${dec(row.pesoTotal)} \\\\`,
      );
    }

    lines.push("\\end{longtable}", "}", "\\end{center}");
  }

  return lines;
}

function buildRunSection(run: PdfRun): string {
  const lines: string[] = [
    `\\section*{Origen: ${toLatexSafe(run.label)}}`,
    `{\\small\\color{CanonMuted}${toLatexSafe(run.originScope)}}`,
    "",
    "\\begin{ParrafoMetodologico}",
    `Prevalidacion: ${toLatexSafe(run.precheck.message)}. Holgura: ${int(run.precheck.diferencia)}. Pedidos: ${int(run.precheck.tallosPedidos)}. Disponibles: ${int(run.precheck.tallosDisponibles)}.`,
    "\\end{ParrafoMetodologico}",
  ];

  if (!run.result) {
    lines.push(
      "",
      "\\begin{ObservationBox}[Sin resultado]",
      "No se resolvio ninguna corrida para este origen.",
      "\\end{ObservationBox}",
    );
    return lines.join("\n");
  }

  const { stage1Summary, stage2Summary, solverMeta, priorityRows, orderRows } = run.result;

  lines.push(
    "",
    "\\begin{center}",
    "{\\small",
    "\\begin{tabular}{@{}l r@{}}",
    "\\toprule",
    "\\textbf{Indicador} & \\textbf{Valor} \\\\",
    "\\midrule",
    `Bunches entrantes & ${int(stage1Summary.pedido_bunches_total)} \\\\`,
    `Bunches resueltos & ${int(stage1Summary.pedido_bunches_resuelto)} \\\\`,
    `Bunches restantes & ${int(stage1Summary.ajuste_bunches_total)} \\\\`,
    `Peso real total (kg) & ${dec(stage2Summary.peso_real_total)} \\\\`,
    `Sobrepeso macro & ${pct(stage2Summary.sobrepeso_pct_macro, "ratio")} \\\\`,
    `Status solver & ${toLatexSafe(String(solverMeta.status ?? "n/a"))} \\\\`,
    "\\bottomrule",
    "\\end{tabular}",
    "}",
    "\\end{center}",
  );

  lines.push(
    "",
    "\\subsection*{Prioridad de cumplimiento}",
    "\\begin{ParrafoMetodologico}",
    "Cada fila muestra la demanda que llego a este origen para esa fecha, lo que el solver resolvio aqui y lo que pasa al siguiente origen.",
    "\\end{ParrafoMetodologico}",
    "\\begin{center}",
    "{\\footnotesize",
    "\\begin{longtable}{@{}c l r r r r@{}}",
    "\\caption{Secuencia interna de cumplimiento por fecha dentro del origen} \\\\",
    "\\toprule",
    "\\textbf{Prior.} & \\textbf{Fecha} & \\textbf{Entrante} & \\textbf{Resuelto} & \\textbf{Restante} & \\textbf{Cumplimiento} \\\\",
    "\\midrule",
    "\\endfirsthead",
    "\\toprule",
    "\\textbf{Prior.} & \\textbf{Fecha} & \\textbf{Entrante} & \\textbf{Resuelto} & \\textbf{Restante} & \\textbf{Cumplimiento} \\\\",
    "\\midrule",
    "\\endhead",
    "\\midrule",
    "\\multicolumn{6}{r}{\\small\\itshape Continua\\ldots} \\\\",
    "\\endfoot",
    "\\bottomrule",
    "\\endlastfoot",
  );

  for (const row of priorityRows) {
    lines.push(
      `${int(row.prioridad)} & ${toLatexSafe(row.fecha)} & ${int(row.pedido)} & ${int(row.resuelto)} & ${int(row.noRealizado)} & ${pct(row.cumplimiento, "ratio")} \\\\`,
    );
  }

  lines.push("\\end{longtable}", "}", "\\end{center}");

  lines.push(
    "",
    "\\subsection*{Orden de trabajo por SKU}",
    "\\begin{ParrafoMetodologico}",
    "La columna Entrante corresponde al pedido que llega a este paso. Resuelto es lo fabricado en este origen. Restante es lo que debe seguir al siguiente paso del flujo.",
    "\\end{ParrafoMetodologico}",
    "\\begin{center}",
    "{\\footnotesize",
    "\\begin{longtable}{@{}p{2.8cm} p{3.2cm} r r r r r r@{}}",
    "\\caption{Orden operativa por SKU dentro del origen} \\\\",
    "\\toprule",
    "\\textbf{SKU} & \\textbf{Estado} & \\textbf{Entrante} & \\textbf{Resuelto} & \\textbf{Restante} & \\textbf{Cumpl.} & \\textbf{Peso bunch} & \\textbf{Sobrepeso} \\\\",
    "\\midrule",
    "\\endfirsthead",
    "\\toprule",
    "\\textbf{SKU} & \\textbf{Estado} & \\textbf{Entrante} & \\textbf{Resuelto} & \\textbf{Restante} & \\textbf{Cumpl.} & \\textbf{Peso bunch} & \\textbf{Sobrepeso} \\\\",
    "\\midrule",
    "\\endhead",
    "\\midrule",
    "\\multicolumn{8}{r}{\\small\\itshape Continua\\ldots} \\\\",
    "\\endfoot",
    "\\bottomrule",
    "\\endlastfoot",
  );

  for (const row of orderRows) {
    lines.push(
      `${toLatexSafe(row.sku)} & ${toLatexSafe(row.estadoPeso)} & ${int(row.pedidoTotal)} & ${int(row.pedidoResuelto)} & ${int(row.ajusteBunches)} & ${pct(row.cumplimientoBunches, "ratio")} & ${dec(row.pesoRealBunch)} & ${pct(row.sobrepesoPct, "ratio")} \\\\`,
    );
  }

  lines.push("\\end{longtable}", "}", "\\end{center}");

  if (run.recipes?.length) {
    lines.push(...buildRecipeSection(run.recipes));
  }

  return lines.join("\n");
}

export function buildOrdenTrabajoDataTex(
  runs: PdfRun[],
  exportDate: Date,
): string {
  const dateStr = exportDate.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const codeDate = [
    exportDate.getFullYear(),
    String(exportDate.getMonth() + 1).padStart(2, "0"),
    String(exportDate.getDate()).padStart(2, "0"),
  ].join("");

  const runCount = runs.length;
  const summary = buildFlowSummaryRows(runs);
  const runSections = runs.map(buildRunSection).join("\n\n\\sectionrule\n\n");
  const summaryRows =
    summary.rows.length > 0
      ? summary.rows
          .map(
            (row) =>
              `  ${toLatexSafe(row.step)} & ${int(row.incoming)} & ${int(row.resolved)} & ${int(row.remaining)} & ${pct(row.compliance, "ratio")} \\\\`,
          )
          .join("\n")
      : "  \\multicolumn{5}{c}{\\textit{Sin corridas para resumir.}} \\\\";

  return [
    `\\SetDocCode{OT-CLAS-${codeDate}}`,
    `\\SetDocDate{${dateStr}}`,
    "",
    "\\newcommand{\\OrdenBody}{%",
    "\\section*{Orden de trabajo de clasificacion en blanco}",
    `\\NoteInline{Fecha de exportacion:} ${dateStr}`,
    "",
    "\\section*{Resumen ejecutivo}",
    "\\begin{ParrafoEjecutivo}",
    `La exportacion consolida ${runCount}~corrida${runCount !== 1 ? "s" : ""} del solver por origen. El flujo acumulado resuelve ${int(summary.totalResolved)} bunches sobre ${int(summary.totalIncoming)} bunches entrantes, con un cumplimiento global de ${pct(summary.overallCompliance, "ratio")} y ${int(summary.totalRemaining)} bunches pendientes para pasos posteriores.`,
    "\\end{ParrafoEjecutivo}",
    "",
    "\\section*{Metodologia}",
    "\\begin{ParrafoMetodologico}",
    "El documento replica la secuencia operativa del solver. Primero se resume el flujo completo por origen y luego se desglosa cada paso con su prioridad interna, la orden de trabajo por SKU y la receta efectiva cuando existe resolucion. El cumplimiento por fecha se interpreta dentro del origen correspondiente y no como cumplimiento absoluto del pedido global inicial.",
    "\\end{ParrafoMetodologico}",
    "",
    "\\section*{Resumen general del flujo}",
    "\\begin{center}",
    "{\\footnotesize",
    "\\begin{longtable}{@{} l r r r r @{}}",
    "\\caption{Flujo consolidado por origen} \\\\",
    "\\toprule",
    "\\textbf{Paso} & \\textbf{Entrante} & \\textbf{Resuelto} & \\textbf{Restante} & \\textbf{Cumplimiento} \\\\",
    "\\midrule",
    "\\endfirsthead",
    "\\toprule",
    "\\textbf{Paso} & \\textbf{Entrante} & \\textbf{Resuelto} & \\textbf{Restante} & \\textbf{Cumplimiento} \\\\",
    "\\midrule",
    "\\endhead",
    "\\midrule",
    "\\multicolumn{5}{r}{\\small\\itshape Continua\\ldots} \\\\",
    "\\endfoot",
    "\\bottomrule",
    "\\endlastfoot",
    summaryRows,
    "\\end{longtable}",
    "}",
    "\\end{center}",
    "",
    runSections,
    "",
    "}",
    "",
  ].join("\n");
}
