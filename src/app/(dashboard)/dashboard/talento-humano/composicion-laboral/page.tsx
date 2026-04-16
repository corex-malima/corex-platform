import { TalentoComposicionPage } from "@/modules/talento-humano/components/composicion-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { requirePageAccess } from "@/lib/api-auth";
import { defaultTalentoSnapshotFilters, getActivosPersonas } from "@/lib/talento-humano";

export const dynamic = "force-dynamic";

async function loadPageData() {
  try {
    return {
      data: await getActivosPersonas(defaultTalentoSnapshotFilters),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Error inesperado al consultar PostgreSQL.",
    };
  }
}

export default async function ComposicionLaboralPage() {
  await requirePageAccess("/dashboard/talento-humano/composicion-laboral");
  const { data, error } = await loadPageData();

  if (!data) {
    return (
      <Card className="bg-card/90">
        <CardHeader>
          <CardTitle>No se pudo cargar composición laboral</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return <TalentoComposicionPage initialData={data} />;
}
