import { requirePageAccess } from "@/lib/api-auth";
import { TthhDomainsAdminPage } from "@/modules/admin-masters/components/tthh-domains-admin-page";

export const dynamic = "force-dynamic";

export default async function TthhDominiosPage() {
  await requirePageAccess("/dashboard/talento-humano/administrar-maestros/dominios");
  return <TthhDomainsAdminPage />;
}
