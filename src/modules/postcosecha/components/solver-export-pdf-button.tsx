"use client";

import { useState } from "react";
import { FileDown, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import type { PoscosechaClasificacionModeResult } from "@/lib/postcosecha-clasificacion-en-blanco-types";

export function SolverExportPdfButton({
  runs,
}: {
  runs: PoscosechaClasificacionModeResult[];
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleExport() {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const printableRuns = runs.filter((run) => run.result !== null || run.precheck.message);
      const response = await fetch(
        "/api/postcosecha/planificacion/solver/clasificacion-en-blanco/pdf",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runs: printableRuns }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? "Error al generar el PDF");
      }

      const disposition = response.headers.get("content-disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? `orden_trabajo_clasificacion_en_blanco_${Date.now()}.pdf`;

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
      toast.error(error instanceof Error ? error.message : "Error al generar el PDF");
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
        : <FileDown className="size-4" aria-hidden="true" />}
      {isGenerating ? "Generando PDF..." : "Exportar PDF"}
    </Button>
  );
}
