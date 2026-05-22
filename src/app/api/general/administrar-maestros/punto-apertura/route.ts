import { type NextRequest } from "next/server";

import { handleGeneralSimpleMasterGet, handleGeneralSimpleMasterPost } from "@/lib/general-master-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleGeneralSimpleMasterGet(request, "opening-points", "No se pudo cargar el maestro de punto de apertura.");
}

export async function POST(request: NextRequest) {
  return handleGeneralSimpleMasterPost(request, {
    kind: "opening-points",
    rateKey: "general-opening-points",
    fallbackActorId: "corex_general_masters_ui",
    createErrorMessage: "No se pudo crear la categoria de punto de apertura.",
  });
}
