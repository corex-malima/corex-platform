import { listCurrentGeneralSimpleMasterRecords } from "@/lib/general-masters";
import { GeneralOpeningPointsPage } from "@/modules/general/components/general-opening-points-page";
import { loadProtectedPageData } from "@/modules/core/server-page";

export const dynamic = "force-dynamic";

export default async function GeneralOpeningPointsPageRoute() {
  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/general/administrar-maestros/punto-apertura",
    loader: () => listCurrentGeneralSimpleMasterRecords("opening-points"),
    fallbackMessage: "No se pudo cargar el maestro de punto de apertura.",
    fallbackData: [],
  });

  return <GeneralOpeningPointsPage initialData={data ?? []} initialError={error} />;
}
