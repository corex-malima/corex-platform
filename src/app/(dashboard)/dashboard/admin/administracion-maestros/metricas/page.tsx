import { requirePageAccess } from "@/lib/api-auth";
import { AdminMetricsPage } from "@/modules/admin-masters/components/admin-metrics-page";

export const dynamic = "force-dynamic";

export default async function MetricasPage() {
  await requirePageAccess("/dashboard/admin/administracion-maestros/metricas");
  return <AdminMetricsPage />;
}
