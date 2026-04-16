import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

import { canAccessResource, getApiAccessRule } from "@/lib/access-control";
import { getSessionUser } from "@/lib/auth";

export async function getCurrentUserAccess() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    username: user.username,
    roleCode: user.roleCode,
    isSuperadmin: user.roleCode === "superadmin",
    allowedResources: user.allowedResources,
    permissionOverrides: user.permissionOverrides,
    isActive: user.isActive,
  };
}

export async function requirePageAccess(resourceKey: string) {
  const access = await getCurrentUserAccess();

  if (!access || !access.isActive) {
    redirect("/login");
  }

  if (!canAccessResource(resourceKey, access.allowedResources, access.isSuperadmin)) {
    redirect("/dashboard");
  }

  return access;
}

export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const access = await getCurrentUserAccess();

  if (!access || !access.isActive) {
    return NextResponse.json(
      { message: "Missing authentication token", error: "Missing authentication token" },
      { status: 401 },
    );
  }

  const rule = getApiAccessRule(request.nextUrl.pathname);
  if (!rule) {
    return NextResponse.json(
      { message: "La ruta API solicitada no esta habilitada.", error: "La ruta API solicitada no esta habilitada." },
      { status: 403 },
    );
  }

  if (rule.policy === "superadmin-only") {
    if (access.isSuperadmin) {
      return null;
    }

    return NextResponse.json(
      { message: "Este recurso es solo para superadmin.", error: "Este recurso es solo para superadmin." },
      { status: 403 },
    );
  }

  if (rule.policy === "internal-dev-only") {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { message: "Ruta no disponible.", error: "Ruta no disponible." },
        { status: 404 },
      );
    }

    if (access.isSuperadmin) {
      return null;
    }

    return NextResponse.json(
      { message: "Este recurso interno es solo para superadmin.", error: "Este recurso interno es solo para superadmin." },
      { status: 403 },
    );
  }

  const requiredResources = rule.requiredResources ?? [];
  const canView = requiredResources.some((resourceKey) =>
    canAccessResource(resourceKey, access.allowedResources, access.isSuperadmin),
  );

  if (!canView) {
    return NextResponse.json(
      { message: "No tienes acceso a este recurso.", error: "No tienes acceso a este recurso." },
      { status: 403 },
    );
  }

  return null;
}
