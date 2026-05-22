import { CampoPuntoAperturaKpiExplorer } from "@/modules/campo/components/campo-punto-apertura-kpi-explorer";
import type { CampoPuntoAperturaKpiData } from "@/lib/campo-punto-apertura-kpi";

export function CampoPuntoAperturaKpiPage({ initialData }: { initialData: CampoPuntoAperturaKpiData }) {
  return <CampoPuntoAperturaKpiExplorer initialData={initialData} />;
}
