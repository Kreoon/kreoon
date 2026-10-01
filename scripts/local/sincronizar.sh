#!/usr/bin/env bash
# Sincroniza tu copia local con la rama de trabajo y deja el entorno listo. No toca secretos ni produccion.
# Uso: bash scripts/local/sincronizar.sh [--sin-install] [--hermes]
set -euo pipefail
RAMA="claude/focused-mendel-es4xcv"
cd "$(git rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain)" ]; then
  echo "Tienes cambios locales sin guardar. Haz commit o 'git stash push -u -m local' y repite."; exit 1
fi
git fetch origin "$RAMA"
git checkout "$RAMA" 2>/dev/null || git checkout -b "$RAMA" "origin/$RAMA"
ANTES_LOCK=$(git rev-parse HEAD:package-lock.json)
git pull --ff-only origin "$RAMA"
echo "Rama $RAMA en $(git rev-parse --short HEAD)"

if [[ " $* " != *" --sin-install "* ]]; then
  if [ ! -d node_modules ] || [ "$ANTES_LOCK" != "$(git rev-parse HEAD:package-lock.json)" ]; then
    npm ci
  fi
fi
if [ ! -f .env.local ] && [ -f .env.example ]; then
  cp .env.example .env.local
  echo "Cree .env.local desde .env.example: completa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (solo la clave anon)."
fi
if [[ " $* " == *" --hermes "* ]]; then
  node scripts/hermes/cola.mjs recoger || true
  node scripts/hermes/cola.mjs estado || true
fi
echo "Listo. Arranca con: npm run dev -- --host 127.0.0.1   (http://127.0.0.1:8080)"
