import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { validateCredentials, setSessionCookie } from "@/lib/auth";
import { checkRateLimit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(1000),
});

function getClientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
}

export async function POST(req: Request) {
  const clientKey = getClientKey(req);
  const gate = checkRateLimit(`login:${clientKey}`, 8, 60_000);

  if (!gate.allowed) {
    const message = "Demasiados intentos de inicio de sesion. Intenta nuevamente en un momento.";
    return NextResponse.json(
      { message, error: message },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } },
    );
  }

  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const message = "Datos de inicio de sesion invalidos.";
    return NextResponse.json(
      { message, error: message },
      { status: 400 },
    );
  }

  const { username, password } = parsed.data;
  const isValid = await validateCredentials(username, password);

  if (!isValid) {
    const message = "Credenciales incorrectas";
    return NextResponse.json(
      { message, error: message },
      { status: 401 },
    );
  }

  await setSessionCookie(username);
  return NextResponse.json({ ok: true });
}
