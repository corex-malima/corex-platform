import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { checkRateLimit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: Record<string, unknown>;
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ message, error: message }, { status, headers });
}

function isValidMessageList(messages: unknown): messages is ChatMessage[] {
  return Array.isArray(messages)
    && messages.length > 0
    && messages.every((message) =>
      message
      && typeof message === "object"
      && (message.role === "user" || message.role === "assistant")
      && typeof message.content === "string"
      && message.content.trim().length > 0);
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
  const rl = checkRateLimit(`chat:${ip}`, 10, 60_000);

  if (!rl.allowed) {
    return jsonError(
      "Demasiados intentos. Intenta nuevamente en un momento.",
      429,
      { "Retry-After": String(rl.retryAfterSeconds) },
    );
  }

  try {
    const { messages, context } = (await request.json()) as ChatRequest;

    if (!isValidMessageList(messages)) {
      return jsonError("La conversacion enviada no es valida.", 400);
    }

    if (!context || typeof context !== "object") {
      return jsonError("El asistente no esta habilitado para esta pantalla.", 400);
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return jsonError("El asistente no esta configurado en este entorno.", 503);
    }

    const contextStr = JSON.stringify(context);
    const systemPrompt = `Eres un asistente del dashboard agricola. Responde en espanol sobre ciclos, areas, variedades y metricas visibles.

HECHOS (usa estos numeros exactamente):
- ${context.activeCount || 0} ciclos activos ahora
- ${context.plannedCount || 0} ciclos planificados
- ${context.historyCount || 0} ciclos en historia
- Areas: ${Array.isArray(context.areas) ? context.areas.length : 0} (${Array.isArray(context.areas) ? context.areas.join(", ") : "ninguna"})
- Variedades: ${Array.isArray(context.varieties) ? context.varieties.length : 0} (${Array.isArray(context.varieties) ? context.varieties.join(", ") : "ninguna"})
- Total: ${Number(context.totalStems || 0).toLocaleString("es-ES")} tallos
- Fecha: ${context.today || "desconocida"}

IMPORTANTE: responde solo con los datos visibles arriba. Se directo, claro y breve.
CONTEXTO JSON: ${contextStr}`;

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system" as const, content: systemPrompt },
          ...messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
        temperature: 0.2,
        max_tokens: 256,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      console.error("[CHAT] Groq API error", response.status);
      return jsonError("No se pudo completar la respuesta del asistente.", 500);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    return NextResponse.json({
      content: data.choices[0]?.message?.content || "Sin respuesta",
    });
  } catch {
    console.error("[CHAT] Internal error");
    return jsonError("Error interno del servidor.", 500);
  }
}
