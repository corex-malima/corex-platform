import { DashboardRouteError, loadProtectedPageData } from "@/modules/core/server-page";
import { CumpleanosPage } from "@/modules/talento-humano/components/cumpleanos-page";
import {
  getCumpleanosData,
  normalizeCumpleanosFilters,
} from "@/lib/talento-humano-cumpleanos";

export const dynamic = "force-dynamic";

export default async function CumpleanosRoute() {
  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/talento-humano/cumpleanos",
    loader: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const currentMonth = String(new Date().getMonth() + 1);
      const filters = normalizeCumpleanosFilters({ corteDate: today, months: currentMonth });
      return getCumpleanosData(filters);
    },
    fallbackMessage: "No se pudo cargar los cumpleaños.",
  });

  if (!data) return <DashboardRouteError title="Cumpleaños" error={error} />;
  return <CumpleanosPage initialData={data} />;
}
