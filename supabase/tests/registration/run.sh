#!/usr/bin/env bash
# Ensayo de las migraciones del relanzamiento contra un Postgres DESCARTABLE (nunca produccion).
# Uso: supabase/tests/registration/run.sh [--before]   (--before: corre solo el esquema "vivo" para evidenciar H1-H4)
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"; MIG="$DIR/../../migrations"
PGBIN=/usr/lib/postgresql/16/bin; DATA=$(mktemp -d); PORT=54999
if [ "$(id -u)" = 0 ]; then RUN="runuser -u postgres --"; else RUN=""; fi
cleanup(){ $RUN "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT
[ "$(id -u)" = 0 ] && chown postgres "$DATA"
$RUN "$PGBIN/initdb" -D "$DATA" -A trust >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp" -l "$DATA/log" -w start >/dev/null
P="$PGBIN/psql -h /tmp -p $PORT -U postgres -X -q -v ON_ERROR_STOP=1"
$RUN $P -d postgres -c "CREATE DATABASE t" >/dev/null
$RUN $P -d t -f "$DIR/00_stub_schema.sql" >/dev/null
$RUN $P -d t -f "$DIR/05_stub_onboarding.sql" >/dev/null
$RUN $P -d t -f "$DIR/10_seed.sql" >/dev/null
if [ "${1:-}" != "--before" ]; then
  for f in 20260930100000_lockdown_membership_paths.sql 20260930110000_creator_registration_core.sql 20260930130000_creator_onboarding_and_unpublished_profiles.sql 20260930160000_brand_members_insert_scope.sql; do
    $RUN $P -d t -f "$MIG/$f" >/dev/null
  done
fi
# Las pruebas comparten una sesion (tabla temporal results): se concatenan en un solo archivo.
if [ "${1:-}" = "--before" ]; then FILES="20_tests_hardening.sql 40_tests_onboarding_defaults.sql 99_report.sql"; else FILES="20_tests_hardening.sql 30_tests_flow.sql 40_tests_onboarding_defaults.sql 41_tests_onboarding_rpc.sql 99_report.sql"; fi
( cd "$DIR" && cat $FILES ) > "$DATA/all_tests.sql"; chmod 644 "$DATA/all_tests.sql"
$RUN $P -d t -f "$DATA/all_tests.sql"
