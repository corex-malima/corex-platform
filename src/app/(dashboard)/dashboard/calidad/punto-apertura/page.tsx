import { defaultPuntoAperturaFilters, getPuntoAperturaDashboardData } from "@/lib/calidad-punto-apertura";
import { DashboardRouteError, loadProtectedPageData } from "@/modules/core/server-page";
import { PuntoAperturaPage } from "@/modules/calidad/components/punto-apertura-page";

export const dynamic = "force-dynamic";

export default async function CalidadPuntoAperturaPage() {
  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/calidad/punto-apertura",
    loader: () => getPuntoAperturaDashboardData(defaultPuntoAperturaFilters),
    fallbackMessage: "Error inesperado al consultar punto de apertura.",
  });

  if (!data) {
    return <DashboardRouteError title="No se pudo cargar punto de apertura" error={error} />;
  }

  return <PuntoAperturaPage initialData={data} />;
}
