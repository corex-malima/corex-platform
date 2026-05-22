import {
  createEmptyCampoPuntoAperturaKpiData,
  defaultCampoPuntoAperturaKpiFilters,
  getCampoPuntoAperturaKpiData,
} from "@/lib/campo-punto-apertura-kpi";
import { CampoPuntoAperturaKpiPage } from "@/modules/campo/components/campo-punto-apertura-kpi-page";
import { loadProtectedPageData } from "@/modules/core/server-page";

export const dynamic = "force-dynamic";

export default async function CampoPuntoAperturaDashboardPage() {
  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/campo/punto-apertura",
    loader: () => getCampoPuntoAperturaKpiData(defaultCampoPuntoAperturaKpiFilters),
    fallbackMessage: "No se pudo cargar el indicador de punto de apertura.",
    fallbackData: createEmptyCampoPuntoAperturaKpiData(defaultCampoPuntoAperturaKpiFilters),
  });

  return <CampoPuntoAperturaKpiPage initialData={data!} />;
}
