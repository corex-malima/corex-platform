import { requirePageAccess } from "@/lib/api-auth";
import { AdminGoalTargetsPage } from "@/modules/admin-masters/components/admin-goal-targets-page";

export const dynamic = "force-dynamic";

export default async function MetasObjetivosPage() {
  await requirePageAccess("/dashboard/admin/administracion-maestros/metas-objetivos");
  return <AdminGoalTargetsPage />;
}
