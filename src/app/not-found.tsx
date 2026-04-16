import Link from "next/link";

import { Button } from "@/shared/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="starter-panel max-w-lg border-border/70 p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Vista no disponible</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Regresa al panel principal o entra por una vista activa del menu.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard">Ir al panel</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Volver al login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
