import { NextResponse } from "next/server";

export function handleApiError(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  console.error(`[API] ${fallbackMessage}:`, error);
  return NextResponse.json({ message, error: message }, { status: 500 });
}
