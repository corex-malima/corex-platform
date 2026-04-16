"use client";

import { MortalityExplorer } from "@/components/dashboard/mortality-explorer";
import type { MortalityDashboardData } from "@/lib/mortality";

export function MortalityPage({ initialData }: { initialData: MortalityDashboardData }) {
  return <MortalityExplorer initialData={initialData} />;
}
