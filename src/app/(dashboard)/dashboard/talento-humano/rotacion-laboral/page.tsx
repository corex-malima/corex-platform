import { TalentoRotacionPage } from "@/modules/talento-humano/components/rotacion-page";
import { DashboardRouteError, loadProtectedPageData } from "@/modules/core/server-page";
import { defaultTalentoFilters, getRotacionData } from "@/lib/talento-humano";

export const dynamic = "force-dynamic";

export default async function RotacionLaboralPage() {
  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/talento-humano/rotacion-laboral",
    loader: () => getRotacionData(defaultTalentoFilters),
    fallbackMessage: "No se pudo cargar el modulo de rotacion laboral.",
  });

  if (!data) return <DashboardRouteError title="Rotacion laboral" error={error} />;
  return <TalentoRotacionPage initialData={data} />;
}
