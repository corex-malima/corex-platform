import { requirePageAccess } from "@/lib/api-auth";
import { AdminUnitsPage } from "@/modules/admin-masters/components/admin-units-page";

export const dynamic = "force-dynamic";

export default async function UnidadesPage() {
  await requirePageAccess("/dashboard/admin/administracion-maestros/unidades");
  return <AdminUnitsPage />;
}
