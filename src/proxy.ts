import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

import { resolveSessionSecret } from "@/lib/session-secret";

const COOKIE_NAME = "wh-session";
const SECRET = resolveSessionSecret();
const legacyRoutes = new Set([
  "/auth/sign-in",
  "/sign-in",
  "/register",
  "/auth/sign-up",
  "/landing",
  "/home",
]);

function verifyToken(token: string): boolean {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return false;

    const expectedSig = crypto.createHmac("sha256", SECRET).update(encoded).digest();
    const providedSig = Buffer.from(sig, "base64url");
    if (providedSig.length !== expectedSig.length || !crypto.timingSafeEqual(providedSig, expectedSig)) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (!payload?.sub || typeof payload.sub !== "string") return false;
    if (typeof payload.exp === "number" && Math.floor(Date.now() / 1000) > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (legacyRoutes.has(pathname)) {
    const destination = pathname === "/home" ? "/dashboard" : "/login";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isAuthenticated = token ? verifyToken(token) : false;

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
