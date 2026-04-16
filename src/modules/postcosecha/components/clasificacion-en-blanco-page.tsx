"use client";

import { PoscosechaClasificacionEnBlancoExplorer } from "@/components/dashboard/postcosecha-clasificacion-en-blanco-explorer";
import type { PoscosechaClasificacionBootData } from "@/lib/postcosecha-clasificacion-en-blanco-types";

export function ClasificacionEnBlancoPage({
  initialData,
  initialError,
}: {
  initialData: PoscosechaClasificacionBootData;
  initialError?: string | null;
}) {
  return (
    <PoscosechaClasificacionEnBlancoExplorer
      initialData={initialData}
      initialError={initialError}
    />
  );
}
