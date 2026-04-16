"use client";

import { CampoExplorer } from "@/components/dashboard/campo-explorer";
import type { CampoDashboardData } from "@/lib/campo";

export function CampoPage({ initialData }: { initialData: CampoDashboardData }) {
  return <CampoExplorer initialData={initialData} />;
}
