"use client";

import type { CurvaCosechaPayload } from "@/lib/campo-curva-cosecha";
import { CurvaCosechaExplorer } from "./curva-cosecha-explorer";

export function CurvaCosechaPage({ initialData }: { initialData: CurvaCosechaPayload }) {
  return <CurvaCosechaExplorer initialData={initialData} />;
}
