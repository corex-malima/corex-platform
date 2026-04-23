#!/usr/bin/env bash
# build_pdf.sh — Compilador canon para Linux/macOS
#
# Uso:
#   ./scripts/build_pdf.sh <ruta_al_tex> [directorio_salida]
#
# Ejemplos:
#   ./scripts/build_pdf.sh examples/example_informe_ejecutivo.tex
#   ./scripts/build_pdf.sh /tmp/canon/job_12345/main.tex /tmp/out
#
# Requisitos:
#   pdflatex (TeX Live o MacTeX)
# ──────────────────────────────────────────────────────────────────────

set -euo pipefail

TEX_FILE="${1:-}"
OUTPUT_DIR="${2:-}"

if [[ -z "$TEX_FILE" ]]; then
  echo "Error: debes proporcionar la ruta al archivo .tex" >&2
  echo "Uso: $0 <archivo.tex> [directorio_salida]" >&2
  exit 1
fi

if [[ ! -f "$TEX_FILE" ]]; then
  echo "Error: archivo no encontrado: $TEX_FILE" >&2
  exit 1
fi

TEX_ABS=$(realpath "$TEX_FILE")
TEX_BASE=$(basename "$TEX_ABS" .tex)

if [[ -z "$OUTPUT_DIR" ]]; then
  OUTPUT_DIR=$(dirname "$TEX_ABS")
fi

mkdir -p "$OUTPUT_DIR"
OUTPUT_ABS=$(realpath "$OUTPUT_DIR")

if ! command -v pdflatex &>/dev/null; then
  echo "Error: pdflatex no está instalado o no está en PATH" >&2
  echo "  Ubuntu/Debian: sudo apt install texlive-latex-extra texlive-fonts-recommended" >&2
  echo "  macOS:         brew install --cask mactex" >&2
  exit 1
fi

TMPDIR_WORK=$(mktemp -d)
trap 'rm -rf "$TMPDIR_WORK"' EXIT

run_pdflatex() {
  pdflatex \
    -interaction=nonstopmode \
    -halt-on-error \
    -output-directory="$TMPDIR_WORK" \
    "$TEX_ABS" \
    > "$TMPDIR_WORK/build.log" 2>&1
}

echo "→ Compilando (pasada 1)..."
if ! run_pdflatex; then
  echo "✗ Error en pasada 1. Log:" >&2
  tail -40 "$TMPDIR_WORK/build.log" >&2
  exit 1
fi

echo "→ Compilando (pasada 2)..."
if ! run_pdflatex; then
  echo "✗ Error en pasada 2. Log:" >&2
  tail -40 "$TMPDIR_WORK/build.log" >&2
  exit 1
fi

PDF_SRC="$TMPDIR_WORK/${TEX_BASE}.pdf"
PDF_DEST="$OUTPUT_ABS/${TEX_BASE}.pdf"

if [[ ! -f "$PDF_SRC" ]]; then
  echo "✗ No se generó el PDF. Revisar: $TMPDIR_WORK/build.log" >&2
  exit 1
fi

cp "$PDF_SRC" "$PDF_DEST"
echo "✓ PDF generado: $PDF_DEST"
echo "  Tamaño: $(du -sh "$PDF_DEST" | cut -f1)"
