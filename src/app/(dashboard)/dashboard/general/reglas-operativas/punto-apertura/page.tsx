import { getGeneralOpeningTargetRuleModuleData } from "@/lib/general-opening-target-rules";
import { DashboardRouteError, loadProtectedPageData } from "@/modules/core/server-page";
import { GeneralOpeningTargetRulesPage } from "@/modules/general/components/general-opening-target-rules-page";

export const dynamic = "force-dynamic";

export default async function GeneralOpeningTargetRulesPageRoute() {
  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/general/reglas-operativas/punto-apertura",
    loader: () => getGeneralOpeningTargetRuleModuleData(),
    fallbackMessage: "No se pudo cargar el registro de reglas de punto de apertura.",
  });

  if (!data) {
    return <DashboardRouteError title="No se pudo cargar punto de apertura" error={error} />;
  }

  return <GeneralOpeningTargetRulesPage initialData={data} initialError={error} />;
}
