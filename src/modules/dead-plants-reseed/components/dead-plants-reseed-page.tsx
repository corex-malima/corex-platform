"use client";

import { DeadPlantsReseedExplorer } from "@/modules/dead-plants-reseed/components/dead-plants-reseed-explorer";
import type { DeadPlantsReseedInitialData } from "@/lib/dead-plants-reseed";

export function DeadPlantsReseedPage({
  initialData,
  initialError,
  canWrite,
}: {
  initialData: DeadPlantsReseedInitialData;
  initialError?: string | null;
  canWrite: boolean;
}) {
  return (
    <DeadPlantsReseedExplorer
      initialData={initialData}
      initialError={initialError}
      canWrite={canWrite}
    />
  );
}
