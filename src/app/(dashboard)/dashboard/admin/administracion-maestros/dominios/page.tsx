import { requirePageAccess } from "@/lib/api-auth";
import { AdminDomainsPage } from "@/modules/admin-masters/components/admin-domains-page";

export const dynamic = "force-dynamic";

export default async function DominiosPage() {
  await requirePageAccess("/dashboard/admin/administracion-maestros/dominios");
  return <AdminDomainsPage />;
}
