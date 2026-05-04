import { getCurrentUserAccess } from "@/lib/api-auth";
import { DashboardHome } from "@/modules/dashboard/components/dashboard-home";

export default async function DashboardPage() {
  const access = await getCurrentUserAccess();

  return (
    <DashboardHome
      allowedResources={access?.allowedResources ?? []}
      isSuperadmin={access?.isSuperadmin ?? false}
    />
  );
}
