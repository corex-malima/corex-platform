import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 * Returns the current authenticated user's username.
 * Returns 401 if not authenticated.
 */
export async function GET() {
  try {
    const access = await getCurrentUserAccess();

    if (!access) {
      const message = "Not authenticated";
      return NextResponse.json(
        { message, error: message },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      userId: access.userId,
      username: access.username,
      roleCode: access.roleCode,
      isSuperadmin: access.isSuperadmin,
      allowedResources: access.allowedResources,
      permissionOverrides: access.permissionOverrides,
      authenticatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[AUTH_ME_ERROR]", error);
    const message = "Failed to get session";
    return NextResponse.json(
      { message, error: message },
      { status: 500 }
    );
  }
}
