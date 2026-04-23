# Integración web — Generación de PDFs desde Next.js

## Requisitos del servidor

- `pdflatex` instalado y en el PATH del proceso Node.js
- Directorio `pdf-canon/` accesible desde `process.cwd()` en producción

### Docker (node:20-slim — ya configurado en el proyecto)

```dockerfile
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     texlive-latex-extra \
     texlive-fonts-recommended \
     texlive-lang-spanish \
  && rm -rf /var/lib/apt/lists/*
```

Copiar el directorio canon al runner:
```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/pdf-canon ./pdf-canon
```

---

## Uso básico

```typescript
// src/app/api/reportes/balanzas/pdf/route.ts
import {
  generateCanonicalPdf,
  pdfBufferToResponse,
} from "@/pdf-canon/scripts/generate_pdf_service";
import { requireAuth } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { semana, anio } = await request.json();

  // 1. Construir el contenido LaTeX de datos dinámicamente
  const dataTexContent = `
\\SetDocTitle{Rendimiento Postcosecha — Semana ${semana}-${anio}}
\\SetDocCode{INF-OPS-${String(semana).padStart(3, "0")}}
\\SetDocArea{Operaciones}
\\SetDocAuthor{Sistema CoreX}
\\SetDocDate{${new Date().toISOString().slice(0, 10)}}
  `.trim();

  // 2. Generar el PDF
  const { pdf } = await generateCanonicalPdf({
    templateName: "informe_ejecutivo",
    dataTexContent,
    jobId: crypto.randomUUID(),
  });

  // 3. Retornar como descarga
  return pdfBufferToResponse(pdf, `balanzas-semana-${semana}-${anio}.pdf`);
}
```

---

## Manejo de errores

```typescript
import {
  generateCanonicalPdf,
  PdfCompileError,
  PdfTemplateNotFoundError,
} from "@/pdf-canon/scripts/generate_pdf_service";

try {
  const result = await generateCanonicalPdf({ ... });
} catch (error) {
  if (error instanceof PdfCompileError) {
    console.error("LaTeX compile failed:", error.buildLog);
    return Response.json(
      { message: "Error al compilar el PDF", error: error.message },
      { status: 500 }
    );
  }
  if (error instanceof PdfTemplateNotFoundError) {
    return Response.json({ message: error.message }, { status: 400 });
  }
  throw error;
}
```

---

## Consideraciones de rendimiento

- Cada compilación crea y destruye un directorio temporal en `/tmp`
- Dos pasadas de pdflatex toman entre 3 y 10 segundos según el documento
- Para documentos frecuentes considerar cache por clave (semana+año+tipo)
- El timeout por defecto es 2 minutos
- Concurrencia ilimitada es segura (cada job tiene su directorio aislado)

---

## Variable de entorno opcional

```env
# Si pdflatex no está en PATH estándar
PDFLATEX_BIN=/usr/bin/pdflatex
```
