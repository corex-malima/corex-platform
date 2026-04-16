import { UsersPage } from "@/modules/users/components/users-page";
import { requirePageAccess } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export default async function UsuariosPageRoute() {
  await requirePageAccess("/dashboard/admin/seguridad/usuarios");
  return <UsersPage />;
}
