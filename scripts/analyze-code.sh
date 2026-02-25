#!/bin/bash
# analyze-code.sh - Analisis automatizado del codigo con Claude Code

set -e

REPORT_DIR="./reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="${REPORT_DIR}/code-analysis-${TIMESTAMP}.md"

mkdir -p "$REPORT_DIR"

echo "Analizando codigo..."

claude --yes "
Analiza el codigo en src/ y genera un reporte con:
1. Problemas de seguridad
2. Codigo duplicado
3. Componentes que necesitan refactorizacion
4. Sugerencias de optimizacion
5. Deuda tecnica identificada

Formato: Markdown estructurado
" > "$REPORT_FILE"

echo "Reporte generado en ${REPORT_FILE}"
