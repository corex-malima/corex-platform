import { CalendarRange } from "lucide-react";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { requirePageAccess } from "@/lib/api-auth";

export default async function PoscosechaPlanDeTrabajoPage() {
  await requirePageAccess("/dashboard/postcosecha/planificacion/plan-de-trabajo");
  return (
    <ModulePlaceholder
      badge="Gestion / Poscosecha / Planificacion"
      title="Plan de trabajo"
      summary="Este modulo queda marcado como proximo dentro de Planificacion. La pagina existe para completar la navegacion y dejar visible el punto donde luego se armara el plan operativo."
      icon={CalendarRange}
      highlights={[
        "El menu ya refleja el desglose completo solicitado para Poscosecha.",
        "Por ahora no se activa ningun flujo de negocio ni carga de datos en esta pantalla.",
        "La ruta queda preparada para integrarse con Programaciones y Solver en una etapa posterior.",
        "Mantenerla visible ayuda a fijar la arquitectura sin romper el formato actual de CoreX.",
      ]}
    />
  );
}
