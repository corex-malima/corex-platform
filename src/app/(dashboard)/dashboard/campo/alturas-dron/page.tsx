import { AlturasDronPage } from "@/modules/campo/components/alturas-dron-page";
import { getAlturasDronData, normalizeAlturasDronFilters } from "@/lib/campo-alturas-dron";
import { DashboardRouteError, loadProtectedPageData } from "@/modules/core/server-page";

export const metadata = {
  title: "Alturas Dron (CHN)",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
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
          dateFrom: searchParams.dateFrom
            ? String(searchParams.dateFrom)
            : defaultDateFrom,
          dateTo: searchParams.dateTo
            ? String(searchParams.dateTo)
            : defaultDateTo,
          block: searchParams.block ? String(searchParams.block) : "",
          cycleKey: searchParams.cycleKey ? String(searchParams.cycleKey) : "",
          q: searchParams.q ? String(searchParams.q) : "",
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
