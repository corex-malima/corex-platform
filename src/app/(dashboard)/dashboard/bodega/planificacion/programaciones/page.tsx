import {
  getDefaultDrenchTargetIsoWeekId,
  listDrenchWeekCalendar,
  listDrenchWeekCalendarOptions,
  type DrenchWeekCalendarFilters,
} from "@/lib/drench-week-calendar";
import { BodegaProgramacionesPage } from "@/modules/bodega/components/bodega-programaciones-page";
import { loadProtectedPageData } from "@/modules/core/server-page";

export default async function BodegaPlanificacionProgramacionesPage() {
  const { data, error } = await loadProtectedPageData({
    resourceKey: "/dashboard/bodega/planificacion/programaciones",
    loader: async () => {
      const defaultIsoWeekId = await getDefaultDrenchTargetIsoWeekId();
      const initialFilters: DrenchWeekCalendarFilters = {
        isoWeekId: defaultIsoWeekId,
        cycleType: "",
        variety: "",
        areaId: "",
      };

      const [initialRows, initialOptions] = await Promise.all([
        listDrenchWeekCalendar(initialFilters),
        listDrenchWeekCalendarOptions(),
      ]);

      return {
        initialRows,
        initialOptions,
        initialFilters,
      };
    },
    fallbackMessage: "No se pudo cargar la calendarizacion semanal de drench para Bodega.",
    fallbackData: {
      initialRows: [],
      initialOptions: {
        isoWeeks: [],
        cycleTypes: [],
        varieties: [],
        areas: [],
        defaultIsoWeekId: "",
      },
      initialFilters: {
        isoWeekId: "",
        cycleType: "",
        variety: "",
        areaId: "",
      },
    },
  });

  return (
    <BodegaProgramacionesPage
      initialRows={data?.initialRows ?? []}
      initialOptions={data?.initialOptions ?? {
        isoWeeks: [],
        cycleTypes: [],
        varieties: [],
        areas: [],
        defaultIsoWeekId: "",
      }}
      initialFilters={data?.initialFilters ?? {
        isoWeekId: "",
        cycleType: "",
        variety: "",
        areaId: "",
      }}
      initialError={error}
    />
  );
}
