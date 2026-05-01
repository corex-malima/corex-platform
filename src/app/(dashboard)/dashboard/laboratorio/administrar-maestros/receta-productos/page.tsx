import { listCurrentBodegaSourceActivities } from "@/lib/bodega-activity-source";
import {
  listCurrentBodegaProducts,
  listCurrentBodegaUnits,
} from "@/lib/bodega-masters";
import {
  listCurrentLaboratoryCategories,
  listCurrentLaboratoryProducts,
} from "@/lib/laboratory-masters";
import { LaboratorioRecetasPage } from "@/modules/laboratorio/components/laboratorio-recetas-page";
import { loadProtectedPageData } from "@/modules/core/server-page";

export default async function LaboratorioRecetasMasterPage() {
  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/laboratorio/administrar-maestros/receta-productos",
    loader: async () => {
      const [initialProducts, initialBodegaProducts, initialUnits, initialCategories, initialActivities] = await Promise.all([
        listCurrentLaboratoryProducts(),
        listCurrentBodegaProducts(),
        listCurrentBodegaUnits(),
        listCurrentLaboratoryCategories(),
        listCurrentBodegaSourceActivities(),
      ]);

      return {
        initialProducts,
        initialBodegaProducts,
        initialUnits,
        initialCategories,
        initialActivities,
      };
    },
    fallbackMessage: "No se pudo cargar el maestro de Laboratorio.",
    fallbackData: {
      initialProducts: [],
      initialBodegaProducts: [],
      initialUnits: [],
      initialCategories: [],
      initialActivities: [],
    },
  });

  return (
    <LaboratorioRecetasPage
      initialProducts={data?.initialProducts ?? []}
      initialBodegaProducts={data?.initialBodegaProducts ?? []}
      initialUnits={data?.initialUnits ?? []}
      initialCategories={data?.initialCategories ?? []}
      initialActivities={data?.initialActivities ?? []}
      initialError={error}
    />
  );
}
