# Relanzamiento Kreoon / UGC Colombia

Registro público exclusivo de creadores por organización, cierre de huecos de seguridad, onboarding único y rebranding.
**Estado:** implementado en la rama `claude/focused-mendel-es4xcv` (PR en borrador). **Nada aplicado en producción.**

| Documento | Contenido |
|---|---|
| [01-AUDITORIA.md](01-AUDITORIA.md) | Qué se verificó y cómo: hallazgos vivos, canal activo, inventario de entradas y funciones |
| [02-DISENO-REGISTRO.md](02-DISENO-REGISTRO.md) | Principios, máquina de estados, consentimientos, onboarding, destino post-login |
| [03-MIGRACION-DATOS.md](03-MIGRACION-DATOS.md) | Dry-run con números reales, manifiesto de mapeo, respaldo y reversión |
| [04-RUNBOOK-DESPLIEGUE.md](04-RUNBOOK-DESPLIEGUE.md) | Orden de despliegue (seguridad primero), configuración externa, verificación y checklist E2E |
| [05-PENDIENTES-Y-RIESGOS.md](05-PENDIENTES-Y-RIESGOS.md) | Decisiones para Alexander, riesgos residuales, validación ejecutada y lo no probado |
| [sql-pendientes/](sql-pendientes/fase2-aislamiento.sql) | Borrador de aislamiento fase 2 (**no** es migración) |

## Migraciones (`supabase/migrations/20260930*`, en orden)

| # | Archivo | Tipo | Riesgo al aplicar |
|---|---|---|---|
| 1 | `…100000_lockdown_membership_paths` | Seguridad | Bajo; cierra accesos indebidos |
| 2 | `…110000_creator_registration_core` | Aditiva (RPC, tabla de alias) | Bajo |
| 3 | `…125000_ugc_colombia_org_config` | **Datos** (1 fila, guarda ID+slug) | Medio: cambia el nombre visible de la org |
| 4 | `…130000_creator_onboarding_and_unpublished_profiles` | Lógica + triggers | Medio: perfiles nuevos nacen sin publicar |
| 5 | `…140000_community_benefits_server_only_metadata` | Seguridad | Bajo |
| 6 | `…150000_platform_brand_defaults` | **Datos** (color) | Bajo |
| 7 | `…160000_brand_members_insert_scope` | Seguridad | Bajo |
| 8 | `…170000_profiles_guard_current_organization` | Seguridad (trigger) | Bajo: bloquea fijar una organización ajena por PATCH |

## Pruebas

```bash
npm test                       # Vitest (lib de registro, destino, onboarding, componentes)
npm run check:contrast         # WCAG AA leyendo los tokens reales de src/index.css
supabase/tests/registration/run.sh            # 72 pruebas SQL sobre Postgres local descartable
supabase/tests/registration/run.sh --before   # mismas pruebas sin migrar: muestran los huecos
```
