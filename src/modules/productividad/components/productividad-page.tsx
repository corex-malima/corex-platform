"use client";

import { ProductividadExplorer } from "@/components/dashboard/productividad-explorer";
import type { ProductividadDashboardData } from "@/lib/productividad";

export function ProductividadPage({ initialData }: { initialData: ProductividadDashboardData }) {
  return <ProductividadExplorer initialData={initialData} />;
}
