import { requirePageAccess } from "@/lib/api-auth";
import {
  getDeadPlantsReseedInitialData,
  type DeadPlantsReseedInitialData,
} from "@/lib/dead-plants-reseed";
import { DeadPlantsReseedPage } from "@/modules/dead-plants-reseed/components/dead-plants-reseed-page";

export const dynamic = "force-dynamic";

const RESOURCE_KEY = "/dashboard/dead-plants-reseed";

const fallbackData: DeadPlantsReseedInitialData = {
  generatedAt: new Date(0).toISOString(),
  blocks: [],
  latestLoads: {
    dead: [],
    reseed: [],
  },
};

export default async function DeadPlantsReseedPageRoute() {
  const access = await requirePageAccess(RESOURCE_KEY);
  const canWrite = access.isSuperadmin || access.roleCode === "custom";
  let initialData = fallbackData;
  let initialError: string | null = null;

  try {
    initialData = await getDeadPlantsReseedInitialData();
  } catch (error) {
    initialError = error instanceof Error
      ? error.message
      : "No se pudo cargar el modulo de plantas muertas y resiembras.";
  }

  return (
    <DeadPlantsReseedPage
      initialData={initialData}
      initialError={initialError}
      canWrite={canWrite}
    />
  );
}
