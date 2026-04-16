import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { validateCredentials, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(1000),
});

function getClientKey(request: Request) {
  const rawKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";

  return rawKey.toLowerCase().replace(/[^a-z0-9:._-]/g, "_").slice(0, 96);
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function getEnvNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function isRateLimitEnabled() {
  return process.env.AUTH_RATE_LIMIT_ENABLED !== "false";
}

function isLoginDebugEnabled() {
  return process.env.AUTH_LOGIN_DEBUG === "true";
}

function logLogin(event: string, details: Record<string, unknown>) {
  if (!isLoginDebugEnabled()) return;
  console.info("[AUTH_LOGIN]", event, details);
}

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json(
    { message, error: message },
    { status, headers },
  );
}

export async function POST(req: Request) {
  const clientKey = getClientKey(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    const message = "Datos de inicio de sesion invalidos.";
    logLogin("invalid-json", { clientKey });
    return jsonError(message, 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const message = "Datos de inicio de sesion invalidos.";
    logLogin("invalid-payload", { clientKey });
    return jsonError(message, 400);
  }

  const { username, password } = parsed.data;
  const normalizedUsername = normalizeUsername(username);
  const userRateKey = `login:${clientKey}:${normalizedUsername}`;
  const ipRateKey = `login-ip:${clientKey}`;

  if (isRateLimitEnabled()) {
    const ipLimit = getEnvNumber("AUTH_LOGIN_IP_RATE_LIMIT", 80);
    const userLimit = getEnvNumber("AUTH_LOGIN_USER_RATE_LIMIT", 8);
    const windowMs = getEnvNumber("AUTH_LOGIN_RATE_LIMIT_WINDOW_MS", 60_000);
    const ipGate = checkRateLimit(ipRateKey, ipLimit, windowMs);
    const userGate = checkRateLimit(userRateKey, userLimit, windowMs);

    if (!ipGate.allowed || !userGate.allowed) {
      const retryAfterSeconds = Math.max(ipGate.retryAfterSeconds, userGate.retryAfterSeconds);
      const message = "Demasiados intentos de inicio de sesion. Intenta nuevamente en un momento.";
      logLogin("rate-limited", {
        clientKey,
        username: normalizedUsername,
        ipRemaining: ipGate.remaining,
        userRemaining: userGate.remaining,
        retryAfterSeconds,
      });
      return jsonError(message, 429, { "Retry-After": String(retryAfterSeconds) });
    }
  }

  logLogin("attempt", { clientKey, username: normalizedUsername });
  const isValid = await validateCredentials(username, password);
  logLogin("validated", { clientKey, username: normalizedUsername, isValid });

  if (!isValid) {
    const message = "Credenciales incorrectas";
    return jsonError(message, 401);
  }

  await setSessionCookie(username);
  resetRateLimit(userRateKey);
  logLogin("session-set", { clientKey, username: normalizedUsername });
  return NextResponse.json({ ok: true });
}
