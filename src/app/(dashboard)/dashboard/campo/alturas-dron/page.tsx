import { AlturasDronPage } from "@/modules/campo/components/alturas-dron-page";
import { getAlturasDronData, normalizeAlturasDronFilters } from "@/lib/campo-alturas-dron";
import { DashboardRouteError, loadProtectedPageData } from "@/modules/core/server-page";

export const metadata = {
  title: "Alturas Dron (CHN)",
};

type SearchParamsRecord = Record<string, string | string[] | undefined>;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  // En Next.js 16 `searchParams` viene como Promise — hay que awaitearlo.
  const sp = await searchParams;

  // Parámetros por defecto: últimos 90 días
  const today = new Date();
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 90);

  const defaultDateFrom = ninetyDaysAgo.toISOString().split("T")[0];
  const defaultDateTo = today.toISOString().split("T")[0];

  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/campo/alturas-dron",
    loader: () =>
      getAlturasDronData(
        normalizeAlturasDronFilters({
          dateFrom: sp.dateFrom ? String(sp.dateFrom) : defaultDateFrom,
          dateTo: sp.dateTo ? String(sp.dateTo) : defaultDateTo,
          block: sp.block ? String(sp.block) : "",
          cycleKey: sp.cycleKey ? String(sp.cycleKey) : "",
          q: sp.q ? String(sp.q) : "",
        }),
      ),
    fallbackMessage: "Error inesperado al consultar datos de alturas dron.",
  });

  if (!data) {
    return (
      <DashboardRouteError
        title="No se pudo cargar el dashboard de alturas dron"
        error={error}
      />
    );
  }

  return <AlturasDronPage initialData={data} />;
}
