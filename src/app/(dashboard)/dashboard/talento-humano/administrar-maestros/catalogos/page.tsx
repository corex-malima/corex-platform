import { requirePageAccess } from "@/lib/api-auth";
import { TthhCatalogsAdminPage } from "@/modules/admin-masters/components/tthh-catalogs-admin-page";

export const dynamic = "force-dynamic";

export default async function CatalogosTthhPage() {
  await requirePageAccess("/dashboard/talento-humano/administrar-maestros/catalogos");
  return <TthhCatalogsAdminPage />;
}
