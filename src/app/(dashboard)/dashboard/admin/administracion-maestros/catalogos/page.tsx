import { requirePageAccess } from "@/lib/api-auth";
import { AdminCatalogsPage } from "@/modules/admin-masters/components/admin-catalogs-page";

export const dynamic = "force-dynamic";

export default async function CatalogosPage() {
  await requirePageAccess("/dashboard/admin/administracion-maestros/catalogos");
  return <AdminCatalogsPage />;
}
