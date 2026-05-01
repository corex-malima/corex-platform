import { listCurrentLaboratoryCategories } from "@/lib/laboratory-masters";
import { LaboratorioTiposPage } from "@/modules/laboratorio/components/laboratorio-tipos-page";
import { loadProtectedPageData } from "@/modules/core/server-page";

export default async function LaboratorioTiposRoute() {
  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/laboratorio/administrar-maestros/tipos-elaboracion",
    loader: listCurrentLaboratoryCategories,
    fallbackMessage: "No se pudo cargar los tipos de Laboratorio.",
    fallbackData: [],
  });

  return <LaboratorioTiposPage initialData={data ?? []} initialError={error} />;
}
