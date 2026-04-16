"use client";

import { BalanzasExplorer } from "@/components/dashboard/balanzas-explorer";
import type { BalanzasDashboardData } from "@/lib/postcosecha-balanzas";

export function BalanzasPage({
  initialData,
  initialError,
}: {
  initialData: BalanzasDashboardData;
  initialError?: string | null;
}) {
  return <BalanzasExplorer initialData={initialData} initialError={initialError} />;
}
