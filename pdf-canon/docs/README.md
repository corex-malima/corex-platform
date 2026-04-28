# Sistema Canon de Documentos PDF

Sistema de plantillas LaTeX institucionales para generación de documentos
formales reproducibles, con integración opcional desde la API web.

## Estructura

```
pdf-canon/
├── base/
│   ├── canon.cls              # Clase LaTeX — fuente de verdad de estilos
│   └── canon_variables.tex    # Valores por defecto de metadatos
├── templates/                 # 10 plantillas de documento
├── examples/                  # Ejemplos funcionales compilables
├── assets/                    # Logo (logo.pdf) y gráficos
├── scripts/
│   ├── build_pdf.sh           # Compilador bash (Linux/macOS)
│   ├── build_pdf.ps1          # Compilador PowerShell (Windows)
│   └── generate_pdf_service.ts# Integración Next.js API
└── docs/
    ├── README.md              # Este archivo
    ├── tipos-documentales.md  # Los 10 tipos y cuándo usarlos
    ├── codigos-documentales.md# Nomenclatura [TIPO]-[AREA]-[###]
    ├── componentes-visuales.md# Referencia de comandos LaTeX
    └── integracion-web.md     # Integración desde la API
```

## Inicio rápido

### Compilar un ejemplo (Linux/macOS)

```bash
cd pdf-canon
bash scripts/build_pdf.sh examples/example_informe_ejecutivo.tex
```

### Compilar un ejemplo (Windows)

```powershell
.\scripts\build_pdf.ps1 -TexFile examples\example_informe_ejecutivo.tex
```

### Usar un template

1. Copiar el template correspondiente de `templates/`
2. Ajustar los `\SetDoc*` con los metadatos del documento
3. Reemplazar el contenido de ejemplo con el contenido real
4. Compilar con el script o directamente con `pdflatex`

## Templates disponibles

| Template | Tipo | Código |
|---|---|---|
| `informe_ejecutivo.tex` | Informe ejecutivo | `INF` |
| `informe_estadistico.tex` | Informe estadístico | `INF` |
| `reporte_tecnico.tex` | Reporte técnico | `REP` |
| `plan_trabajo.tex` | Plan de trabajo | `PLN` |
| `plan_tecnico.tex` | Plan técnico | `PLN` |
| `solicitud_formal.tex` | Solicitud / Petición | `PET` |
| `memorando.tex` | Memorando | `MEM` |
| `acta_minuta.tex` | Acta / Minuta | `ACT` |
| `ficha_resumen.tex` | Ficha resumen | `FIC` |
| `anexo_tecnico.tex` | Anexo técnico | `ANX` |

## Documentación

| Archivo | Contenido |
|---|---|
| `tipos-documentales.md` | Los 10 tipos, descripción y criterios de uso |
| `codigos-documentales.md` | Cómo asignar códigos `[TIPO]-[AREA]-[###]` |
| `componentes-visuales.md` | Todos los comandos LaTeX del canon |
| `integracion-web.md` | Integración con Next.js API routes |

## Requisitos

- **pdflatex** — TeX Live 2022+ o MiKTeX 22+
- Paquetes Debian mínimos: `texlive-latex-base`, `texlive-latex-recommended`,
  `texlive-latex-extra`, `texlive-fonts-recommended`, `texlive-pictures`,
  `texlive-lang-spanish`, `tex-gyre`
- Paquetes LaTeX usados:
  `geometry`, `fontenc`, `inputenc`, `tgpagella`, `helvet`,
  `microtype`, `booktabs`, `longtable`, `adjustbox`, `xcolor`, `graphicx`,
  `fancyhdr`, `titlesec`, `enumitem`, `tcolorbox`, `float`, `caption`,
  `hyperref`, `ifthen`, `etoolbox`, `babel`, `lastpage`
- Mono: Computer Modern Typewriter (default LaTeX, sin dependencia extra)

## Logo

Colocar el logo en `assets/logo.pdf` (o `.png`).
Si el archivo no existe, el canon muestra `[logo]` como fallback — los documentos
compilan correctamente sin logo.
