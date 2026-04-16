export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="starter-panel flex w-full max-w-sm flex-col items-center gap-4 border-border/70 p-8 text-center">
        <div className="size-10 animate-spin rounded-full border-2 border-slate-700/20 border-t-primary" />
        <div className="space-y-1">
          <p className="font-medium">Cargando panel</p>
          <p className="text-sm text-muted-foreground">Preparando indicadores.</p>
        </div>
      </div>
    </div>
  );
}
