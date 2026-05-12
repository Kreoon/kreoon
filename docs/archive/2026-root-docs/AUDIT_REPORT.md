# KREOON Platform Audit Report

**Fecha**: 2026-02-20
**Ejecutado por**: Claude Code (automated audit)
**Base de datos**: Supabase project `wjkbqcrxwsmvtxmqgiqc`

---

## 1. Resumen Ejecutivo

Se auditaron los **75 usuarios**, **3 organizaciones**, suscripciones, roles, tokens de IA, y permisos de toda la plataforma KREOON. Se encontraron **12 hallazgos**, de los cuales **6 fueron corregidos automaticamente** y **6 quedan pendientes** de decision o implementacion futura.

| Categoria | Hallazgos | Corregidos | Pendientes |
|-----------|-----------|------------|------------|
| Suscripciones/Trials | 3 | 1 | 2 |
| Roles y permisos | 4 | 2 | 2 |
| AI Tokens | 2 | 0 | 2 |
| Usuarios | 2 | 1 | 1 |
| Wallets/Financiero | 1 | 0 | 1 |

---

## 2. Censo de la Plataforma

### 2.1 Usuarios
| Metrica | Valor |
|---------|-------|
| Total auth.users | 75 |
| En organizaciones | 70 |
| Huerfanos (sin org) | 5 |
| Nunca iniciaron sesion | 12 |
| Multi-org | 1 (jacsolucionesgraficas@gmail.com) |

### 2.2 Organizaciones
| Organizacion | Miembros | Plan | Status | Owner |
|-------------|----------|------|--------|-------|
| UGC Colombia | 59 unicos (95 memberships) | org_pro ($599/mes) | active | alexander7818@gmail.com |
| Grupo effi | 2 | free (trial expirado) | expired | jacsolucionesgraficas@gmail.com* |
| Prueba | 1 | free (trial expirado) | expired | jacsolucionesgraficas@gmail.com* |

*Owner asignado durante esta auditoria.

### 2.3 Roles (UGC Colombia)
| Rol | Cantidad | Permission Group | Dashboard |
|-----|----------|-----------------|-----------|
| creator | 52 | creator | /creator-dashboard |
| brand_manager | 31 | client | /client-dashboard |
| admin | 5 | admin | /dashboard |
| editor | 4 | editor | /editor-dashboard |
| strategist | 2 | strategist | /strategist-dashboard |
| client | 1 | client | /client-dashboard |

### 2.4 Suscripciones
| Tabla | Registros | Estado |
|-------|-----------|--------|
| user_subscriptions | 79 | Todos "free/active" (legacy, no refleja plan real) |
| platform_subscriptions | 1 | UGC Colombia: org_pro, active, $599/mes |

### 2.5 AI Tokens
| Org/Usuario | Tier | Sub Tokens | Consumidos | Uso |
|------------|------|-----------|------------|-----|
| UGC Colombia | org_pro | 59,700/60,000 | 300 | 0.5% |
| 4 usuarios individuales | creator_free | 800 c/u | 0 | 0% |

### 2.6 Wallets Unificadas
| Tipo | Cantidad | Balance Total |
|------|----------|---------------|
| platform | 1 | $0 |
| organization | 1 (UGC Colombia) | $0 |
| creator | 5 | $0 |
| **Total** | **7** | **$0** |

---

## 3. Hallazgos y Correcciones

### CORREGIDO: Trials expirados nunca desactivados
- **Severidad**: URGENTE
- **Detalle**: Grupo effi (trial vencio 2026-02-04, 16 dias) y Prueba (2026-01-28, 23 dias) tenian `trial_active=true` y `subscription_status='trial'` pese a estar vencidos.
- **Fix aplicado**: `UPDATE organizations SET trial_active=false, subscription_status='expired' WHERE name IN ('Grupo effi','Prueba')`
- **Pendiente**: Crear cron job diario para expiracion automatica de trials.

### CORREGIDO: Rol 'ambassador' como rol funcional
- **Severidad**: ALTA
- **Detalle**: `valeriaozugc@gmail.com` tenia `role='ambassador'` en organization_members. Ambassador es un badge, no un rol funcional. El frontend no tiene dashboard ni permisos para este "rol".
- **Fix aplicado**: `UPDATE organization_members SET role='creator' WHERE user_id=... AND role='ambassador'`

### CORREGIDO: Flag is_ambassador desincronizada (9 usuarios)
- **Severidad**: MEDIA
- **Detalle**: 9 miembros tenian badge activo de ambassador (bronze) en `organization_member_badges` pero `is_ambassador=false` en `organization_members`.
- **Fix aplicado**: Sincronizados los 9 registros: ale312109, alejaposada1112, comercialugccolombia, isabellahoyos117, michellccorzo, mile_160711, naranjo.camila24, shirleymarin333, valmarugc.

### CORREGIDO: Organizaciones sin owner
- **Severidad**: MEDIA
- **Detalle**: Grupo effi y Prueba no tenian owner. El usuario `created_by` (UUID 06aa55b0...) fue eliminado de auth.users.
- **Fix aplicado**: `jacsolucionesgraficas@gmail.com` (admin en ambas) promovido a `is_owner=true`.

### VERIFICADO: brand_manager (31 usuarios) funciona correctamente
- **Severidad**: BAJA (no es bug)
- **Detalle**: Investigado el codigo. `brand_manager` esta definido en `permissionGroups.ts` mapeado al grupo `client`. Los 31 usuarios ven ClientDashboard con Client Portal, Producciones, Social Hub, Marketing Ads. UI completamente funcional.

### VERIFICADO: Cron jobs financieros activos
- **Severidad**: INFO
- **Detalle**: 4 cron jobs activos: escrow auto-approve (horario), referral inactivity (mensual), token reset (mensual), referral leaderboard (mensual).

---

## 4. Hallazgos Pendientes (requieren decision)

### PENDIENTE: user_subscriptions desconectada de platform_subscriptions
- **Severidad**: ALTA
- **Detalle**: Los 69 miembros de UGC Colombia (org con plan org_pro a $599/mes) aparecen como `plan='free'` en `user_subscriptions`. Hay 4 registros duplicados (79 records para 75 users).
- **Impacto**: Cualquier codigo frontend que consulte `user_subscriptions.plan` bloqueara incorrectamente features de pago.
- **Opciones**:
  1. Deprecar `user_subscriptions` y usar solo `platform_subscriptions` con logica de org
  2. Crear sync automatico: cuando org sube de plan, actualizar user_subscriptions de todos sus miembros
  3. Migrar todo el gating a verificar `platform_subscriptions` via org membership

### PENDIENTE: 71/75 usuarios sin ai_token_balances ni unified_wallets
- **Severidad**: MEDIA
- **Detalle**: Solo 5 usuarios recientes tienen registros financieros. Los 70 restantes no tienen wallet ni balance de tokens. 4 balances individuales tienen `organization_id=NULL` para usuarios que SI pertenecen a UGC Colombia.
- **Recomendacion**: Backfill migration para crear registros faltantes. Fix auto-creation logic para vincular con org.

### PENDIENTE: 5 usuarios huerfanos sin organizacion
- **Severidad**: MEDIA
- **Detalle**:
  1. `romerosebastian132@gmail.com` - Tiene contenido asignado (critico: contenido huerfano)
  2. `camilahoyosr@hotmail.com` - Nunca inicio sesion, tiene badge revocado
  3. `samuecatano@gmail.com` - Inicio sesion 1 vez
  4. `andres.5007@hotmail.com` - Inicio sesion 1 vez
  5. `estoeskatapis@gmail.com` - Inicio sesion 1 vez, tiene token balance
- **Recomendacion**: Re-agregar `romerosebastian132` a su org original. Los demas: invitar o limpiar tras periodo de gracia.

### PENDIENTE: Limite de miembros por plan no enforced
- **Severidad**: MEDIA
- **Detalle**: UGC Colombia tiene 95 memberships pero su plan org_pro limita a 70 (10 admin + 5 strategist + 5 editor + 50 creator). El limite no se verifica en codigo al agregar miembros.
- **Recomendacion**: Implementar verificacion en el endpoint/hook de agregar miembros.

### PENDIENTE: Monedas mixtas en wallets
- **Severidad**: BAJA
- **Detalle**: 4 wallets en USD, 1 en COP (alexander7818@gmail.com). Sin sistema de tipo de cambio.
- **Recomendacion**: Estandarizar moneda por org o implementar conversion.

### PENDIENTE: No existe mecanismo de expiracion automatica de trials
- **Severidad**: ALTA
- **Detalle**: No hay cron job ni webhook que cambie `trial_active=false` cuando `trial_end_date < NOW()`.
- **Recomendacion**: Crear cron job diario:
```sql
UPDATE organizations
SET trial_active = false, subscription_status = 'expired'
WHERE trial_active = true
  AND trial_end_date < NOW()
  AND NOT EXISTS (
    SELECT 1 FROM platform_subscriptions ps
    WHERE ps.organization_id = organizations.id
    AND ps.status = 'active'
  );
```

---

## 5. Resumen de Acceso por Rol

| Modulo | admin | team_leader | strategist | creator | editor | client/brand_mgr |
|--------|-------|-------------|------------|---------|--------|------------------|
| Dashboard principal | /dashboard | /dashboard | /strategist-dashboard | /creator-dashboard | /editor-dashboard | /client-dashboard |
| ContentBoard | Full | Full | Full | Solo asignado | Solo asignado | Solo asignado |
| Team management | Full | Full | No | No | No | No |
| Settings completos | Full | No | No | No | No | No |
| Billing/Plans | Full | No | No | No | No | No |
| AI Features | Full | Full | Token-gated | Token-gated | Token-gated | No |
| Marketplace | Full | Full | Full | Full | Full | View-only |
| Social Hub | Full | Full | Full | Full | No | Full |
| Marketing Ads | Full | Full | Full | No | No | Full |

---

## 6. AI Token Costs Verificados

| Accion | Tokens | Verificado |
|--------|--------|------------|
| Full Research | 600 | En constantes |
| DNA Full Analysis | 500 | En constantes |
| DNA Project Analysis | 400 | En constantes |
| Script Generation | 120 | En constantes |
| Board Research Context | 150 | En constantes |
| Live Generate | 150 | En constantes |
| Board Analysis | 100 | En constantes |
| Research Phase | 100 | En constantes |
| Board Analyze Card | 80 | En constantes |
| Social AI Captions | 60 | Verificado en transacciones (5x60=300) |
| Talent Match | 60 | En constantes |
| Script Improve | 60 | En constantes |
| Portfolio Bio | 50 | En constantes |
| Content Analyze | 40 | En constantes |
| Board Suggestions | 40 | En constantes |
| Default | 40 | En constantes |
| Portfolio Caption | 25 | En constantes |
| Script blocks | 15-25 | En constantes (nuevo) |
| Script Chat | 20 | En constantes |
| Transcription | 15 | En constantes |

Token guard verificado en `content-ai` edge function (desplegado hoy). Los 5 consumos registrados (social_ai.generate_captions x 60 tokens) coinciden con el costo definido.

---

## 7. Planes y Precios

### Brand Plans
| Plan | Precio/mes | Tokens | Usuarios | Contenido/mes | Storage |
|------|-----------|--------|----------|---------------|---------|
| Free | $0 | 300 | 1 | 0 | - |
| Starter | $39 | 4,000 | 3 | 30 | 5GB |
| Pro | $129 | 12,000 | 10 | 150 | 50GB |
| Business | $349 | 40,000 | Ilimitado | Ilimitado | 500GB |

### Creator Plans
| Plan | Precio/mes | Tokens |
|------|-----------|--------|
| Basico | $0 | 800 |
| Pro | $24 | 6,000 |

### Agency Plans
| Plan | Precio/mes | Tokens | Clientes | Team |
|------|-----------|--------|----------|------|
| Starter | $249 | 20,000 | 10 | 29 |
| Pro | $599 | 60,000 | 25 | 70 |
| Enterprise | Custom | 200,000 | Ilimitado | Ilimitado |

---

## 8. Proximos Pasos Recomendados

1. **Crear cron job de expiracion de trials** (prioridad alta)
2. **Decidir estrategia para user_subscriptions** — deprecar o sincronizar (prioridad alta)
3. **Backfill ai_token_balances y unified_wallets** para 71 usuarios existentes (prioridad media)
4. **Implementar enforcement de limite de miembros** por plan (prioridad media)
5. **Resolver 5 usuarios huerfanos** — especialmente romerosebastian132 que tiene contenido (prioridad media)
6. **12 usuarios nunca han iniciado sesion** — considerar recordatorio o cleanup (prioridad baja)
