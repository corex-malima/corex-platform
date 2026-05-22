import { SimpleMasterPage } from "@/modules/domain-masters/components/simple-master-page";
import type { GeneralSimpleMasterRecord } from "@/lib/general-master-types";

export function GeneralOpeningPointsPage({
  initialData,
  initialError,
}: {
  initialData: GeneralSimpleMasterRecord[];
  initialError?: string | null;
}) {
  return (
    <SimpleMasterPage
      initialData={initialData}
      initialError={initialError}
      config={{
        apiEndpoint: "/api/general/administrar-maestros/punto-apertura",
        resourceNameSingular: "Punto de apertura",
        resourceNamePlural: "Puntos de apertura",
        eyebrow: "Administracion / Maestros por dominio / General / Punto de apertura",
        title: "Punto de apertura",
        subtitle: "Administra el maestro oficial de categorias de punto de apertura para Calidad y para las reglas operativas vigentes. Cada guardado conserva trazabilidad SCD2 en db_general.public.",
        searchPlaceholder: "Buscar por codigo, categoria o orden...",
        newButtonLabel: "Nuevo punto de apertura",
        saveButtonLabel: "Guardar punto de apertura",
        listTitle: "Categorias de punto de apertura",
        listDescription: "Selecciona una categoria para editarla o registra una nueva si negocio amplia el criterio operativo.",
        editorDescription: "Este maestro alimenta tanto el criterio operativo en Gestion como la futura comparacion automatica de cumplimiento.",
        codeLabel: "Codigo categoria",
        nameLabel: "Categoria visible",
        externalRefLabel: "Orden operativo",
        externalRefPlaceholder: "Opcional. Ej. 01, 02, 03...",
        showContactEmail: false,
        storageScopeLabel: "db_general.public",
      }}
    />
  );
}
