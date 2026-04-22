import { ClipboardList } from "lucide-react";

import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { requirePageAccess } from "@/lib/api-auth";

export default async function CalidadTemperaturaInvernaderosPage() {
  await requirePageAccess("/dashboard/calidad/registros/temperatura-invernaderos");

  return (
    <ModulePlaceholder
      badge="Gestion / Calidad / Registros"
      title="Temperatura invernaderos"
      summary="Ruta reservada para registros de temperatura en invernaderos. El modulo queda ubicado en Gestion > Calidad > Registros para crecer con la misma estructura de captura del resto del sistema."
      icon={ClipboardList}
      highlights={[
        "Calidad queda al mismo nivel que Campo y Postcosecha dentro de Gestion.",
        "Registros funciona como subindice contenedor antes de activar capturas especificas.",
        "Temperatura invernaderos queda lista para conectar formularios, fuentes y validaciones futuras.",
        "El acceso queda registrado automaticamente como recurso administrable del sistema.",
      ]}
    />
  );
}
