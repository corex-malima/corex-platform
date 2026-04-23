"use client";

import { useState } from "react";
import { FileDown, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import type { PoscosechaClasificacionModeResult } from "@/lib/postcosecha-clasificacion-en-blanco-types";

function buildFilename() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `orden_trabajo_clasificacion_en_blanco_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.pdf`;
}

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

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildFilename();
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
