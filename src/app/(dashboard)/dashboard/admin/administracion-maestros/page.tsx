import { requirePageAccess } from "@/lib/api-auth";
import { AdminMastersPage } from "@/modules/admin-masters/components/admin-masters-page";

export const dynamic = "force-dynamic";

export default async function AdministracionMaestrosPage() {
  await requirePageAccess("/dashboard/admin/administracion-maestros");
  return <AdminMastersPage />;
}
