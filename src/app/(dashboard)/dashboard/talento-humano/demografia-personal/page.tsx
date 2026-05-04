import { TalentoDemografiaPage } from "@/modules/talento-humano/components/demografia-page";
import { DashboardRouteError, loadProtectedPageData } from "@/modules/core/server-page";
import { defaultTalentoSnapshotFilters, getActivosPersonas } from "@/lib/talento-humano";

export const dynamic = "force-dynamic";

export default async function DemografiaPersonalPage() {
  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/talento-humano/demografia-personal",
    loader: () => getActivosPersonas(defaultTalentoSnapshotFilters),
    fallbackMessage: "No se pudo cargar el modulo de demografia personal.",
  });

  if (!data) return <DashboardRouteError title="Demografía del personal" error={error} />;
  return <TalentoDemografiaPage initialData={data} />;
}
