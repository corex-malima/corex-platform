import { PuntoAperturaExplorer } from "@/modules/calidad/components/punto-apertura-explorer";
import type { PuntoAperturaDashboardData } from "@/lib/calidad-punto-apertura";

export function PuntoAperturaPage({ initialData }: { initialData: PuntoAperturaDashboardData }) {
  return <PuntoAperturaExplorer initialData={initialData} />;
}
