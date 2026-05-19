import {
  defaultCurvaCosechaFilters,
  getCurvaCosechaDashboardData,
} from "@/lib/campo-curva-cosecha";
import { CurvaCosechaPage } from "@/modules/campo/components/curva-cosecha-page";
import { DashboardRouteError, loadProtectedPageData } from "@/modules/core/server-page";

export const dynamic = "force-dynamic";

export default async function CurvaCosechaPageRoute() {
  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/curva-cosecha",
    loader: () => getCurvaCosechaDashboardData(defaultCurvaCosechaFilters),
    fallbackMessage: "Error inesperado al consultar PostgreSQL.",
  });

  if (!data) {
    return (
      <DashboardRouteError
        title="No se pudo cargar la curva de cosecha agregada"
        error={error}
      />
    );
  }

  return <CurvaCosechaPage initialData={data} />;
}
