import { requirePageAccess } from "@/lib/api-auth";
import { AdminMastersPage } from "@/modules/admin-masters/components/admin-masters-page";

export const dynamic = "force-dynamic";

export default async function MetasObjetivosPage() {
  await requirePageAccess("/dashboard/admin/administracion-maestros/metas-objetivos");
  return <AdminMastersPage />;
}
