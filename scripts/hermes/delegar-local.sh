#!/usr/bin/env bash
# Mac / Linux / WSL / Git Bash:  ./delegar-local.sh [tareas...]   (DRY=1 para ensayo; SERVIDOR=otro-host)
set -eu
SERVIDOR="${SERVIDOR:-servidor-casa}"
AQUI="$(cd "$(dirname "$0")" && pwd)"
LISTA="${*:-1 2 3 4}"
PREFIJO=""; [ "${DRY:-0}" = "1" ] && PREFIJO="DRY=1 "
echo "Enviando a $SERVIDOR: tareas $LISTA${PREFIJO:+ (ENSAYO)}"
ssh "$SERVIDOR" "${PREFIJO}bash -s -- $LISTA" < "$AQUI/delegar.sh"
