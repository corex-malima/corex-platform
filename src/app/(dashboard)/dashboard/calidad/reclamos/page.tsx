import {
  createEmptyQualityClaimDashboardData,
  getQualityClaimDashboardPlanData,
} from "@/lib/calidad-reclamos-dashboard";
import { ReclamosDashboardPage } from "@/modules/calidad/components/reclamos-dashboard-page";
import { loadProtectedPageData } from "@/modules/core/server-page";

export const dynamic = "force-dynamic";

export default async function CalidadReclamosPageRoute() {
  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/calidad/reclamos",
    loader: getQualityClaimDashboardPlanData,
    fallbackMessage: "No se pudo cargar el frente analitico de reclamos.",
    fallbackData: createEmptyQualityClaimDashboardData("quality"),
  });

  return (
    <ReclamosDashboardPage
      initialData={data!}
      initialError={error}
      eyebrow="Analitica / Calidad / Reclamos"
      title="Reclamos"
      subtitle="Lectura integral de los reclamos de calidad, separando notas de credito frente a alertas y priorizando la desagregacion por tipo de problema y problema especifico."
    />
  );
}
