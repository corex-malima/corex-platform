import { TalentoComposicionPage } from "@/modules/talento-humano/components/composicion-page";
import { DashboardRouteError, loadProtectedPageData } from "@/modules/core/server-page";
import { defaultTalentoSnapshotFilters, getActivosPersonas } from "@/lib/talento-humano";

export const dynamic = "force-dynamic";

export default async function ComposicionLaboralPage() {
  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/talento-humano/composicion-laboral",
    loader: () => getActivosPersonas(defaultTalentoSnapshotFilters),
    fallbackMessage: "No se pudo cargar el modulo de composicion laboral.",
  });

  if (!data) return <DashboardRouteError title="Composicion laboral" error={error} />;
  return <TalentoComposicionPage initialData={data} />;
}
