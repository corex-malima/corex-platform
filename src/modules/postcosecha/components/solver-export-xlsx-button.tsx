"use client";

import { useState } from "react";
import { FileSpreadsheet, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import type { PoscosechaClasificacionModeResult } from "@/lib/postcosecha-clasificacion-en-blanco-types";

/**
 * Exporta SOLO la receta de la orden de trabajo (combinaciones + consumo por
 * grado) a XLSX. Reusa la misma resolución de recetas que el PDF en el backend.
 */
export function SolverExportXlsxButton({
  runs,
}: {
  runs: PoscosechaClasificacionModeResult[];
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleExport() {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const exportableRuns = runs.filter((run) => run.result !== null);
      if (exportableRuns.length === 0) {
        toast.error("No hay corridas resueltas para exportar.");
        return;
      }

      const response = await fetch(
        "/api/postcosecha/planificacion/solver/clasificacion-en-blanco/xlsx",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runs: exportableRuns }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? "Error al generar el XLSX");
      }

      const disposition = response.headers.get("content-disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? `receta_orden_trabajo_clasificacion_en_blanco_${Date.now()}.xlsx`;

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al generar el XLSX");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleExport}
      disabled={isGenerating}
      aria-busy={isGenerating}
    >
      {isGenerating
        ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        : <FileSpreadsheet className="size-4" aria-hidden="true" />}
      {isGenerating ? "Generando XLSX..." : "Exportar receta XLSX"}
    </Button>
  );
}
