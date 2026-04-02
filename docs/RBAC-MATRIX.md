# KREOON RBAC Matrix - Auditoría de Permisos

**Fecha**: 2026-03-27
**Versión**: 1.0
**Auditor**: Claude Opus 4.5 (RBAC-Auditor Agent)

---

## 1. Resumen Ejecutivo

KREOON implementa un sistema RBAC (Role-Based Access Control) de dos niveles:
1. **Permission Groups (6)**: Grupos de permisos unificados para control de acceso
2. **Roles específicos (44)**: 8 roles globales + 36 especializaciones de marketplace

### Arquitectura de Roles

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERMISSION GROUPS (6)                         │
├─────────────┬────────────┬──────────┬────────┬──────────┬───────┤
│   admin     │team_leader │strategist│ editor │ creator  │client │
├─────────────┴────────────┴──────────┴────────┴──────────┴───────┤
│                      ROLE AREAS (7)                              │
│  system | strategy_marketing | post_production | content_creation│
│         | technology | education | client                        │
├─────────────────────────────────────────────────────────────────┤
│                    SPECIFIC ROLES (44)                           │
│  8 Global + 36 Marketplace specializations                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Matriz de Permisos por Módulo

### 2.1 Dashboards

| Dashboard               | admin | team_leader | strategist | trafficker | creator | editor | client |
|------------------------|:-----:|:-----------:|:----------:|:----------:|:-------:|:------:|:------:|
| `/dashboard`           |  ✅   |     ✅      |     ❌     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/creator-dashboard`   |  ❌   |     ❌      |     ❌     |     ❌     |   ✅    |   ❌   |   ❌   |
| `/editor-dashboard`    |  ❌   |     ❌      |     ❌     |     ❌     |   ❌    |   ✅   |   ❌   |
| `/strategist-dashboard`|  ❌   |     ❌      |     ✅     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/client-dashboard`    |  ❌   |     ❌      |     ❌     |     ❌     |   ❌    |   ❌   |   ✅   |
| `/freelancer-dashboard`|  ⚠️   |     ⚠️      |     ⚠️     |     ⚠️     |   ⚠️    |   ⚠️   |   ⚠️   |

**Nota**: ⚠️ = `allowNoRoles` (usuarios sin roles org pero con `platform_access_unlocked`)

### 2.2 Módulos de Operaciones

| Módulo/Ruta            | admin | team_leader | strategist | trafficker | creator | editor | client |
|-----------------------|:-----:|:-----------:|:----------:|:----------:|:-------:|:------:|:------:|
| `/board`              |  ✅   |     ✅      |     ✅     |     ✅     |   ✅    |   ✅   |   ✅   |
| `/content`            |  ✅   |     ✅      |     ✅     |     ✅     |   ✅    |   ✅   |   ❌   |
| `/talent`             |  ✅   |     ✅      |     ✅     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/clients-hub`        |  ✅   |     ✅      |     ✅     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/scripts`            |  ✅   |     ❌      |     ✅     |     ❌     |   ❌    |   ✅   |   ❌   |
| `/marketing`          |  ✅   |     ❌      |     ✅     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/ranking`            |  ✅   |     ❌      |     ❌     |     ❌     |   ✅    |   ✅   |   ❌   |

### 2.3 CRM (Platform-Level)

| Ruta CRM               | admin | team_leader | strategist | trafficker | creator | editor | client |
|-----------------------|:-----:|:-----------:|:----------:|:----------:|:-------:|:------:|:------:|
| `/crm`                |  🔒   |     ❌      |     ❌     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/crm/leads`          |  🔒   |     ❌      |     ❌     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/crm/organizaciones` |  🔒   |     ❌      |     ❌     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/crm/personas`       |  🔒   |     ❌      |     ❌     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/crm/marcas`         |  🔒   |     ❌      |     ❌     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/crm/finanzas`       |  🔒   |     ❌      |     ❌     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/crm/email-marketing`|  🔒   |     ❌      |     ❌     |     ❌     |   ❌    |   ❌   |   ❌   |

**Nota**: 🔒 = `requirePlatformAdmin` (solo ROOT_EMAILS o user_roles.role='admin')

### 2.4 CRM Organizacional

| Ruta Org-CRM           | admin | team_leader | strategist | trafficker | creator | editor | client |
|-----------------------|:-----:|:-----------:|:----------:|:----------:|:-------:|:------:|:------:|
| `/org-crm/pipelines`  |  ✅   |     ✅      |     ✅     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/org-crm/finanzas`   |  ✅   |     ✅      |     ✅     |     ❌     |   ❌    |   ❌   |   ❌   |

### 2.5 Admin & Finanzas

| Ruta                   | admin | team_leader | strategist | trafficker | creator | editor | client |
|-----------------------|:-----:|:-----------:|:----------:|:----------:|:-------:|:------:|:------:|
| `/admin/wallets`      |  ✅   |     ❌      |     ❌     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/admin/analytics`    |  ✅   |     ❌      |     ❌     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/admin/papelera`     |  ✅   |     ❌      |     ❌     |     ❌     |   ❌    |   ❌   |   ❌   |
| `/wallet`             |  ⚠️   |     ⚠️      |     ⚠️     |     ⚠️     |   ⚠️    |   ⚠️   |   ⚠️   |
| `/settings`           |  ⚠️   |     ⚠️      |     ⚠️     |     ⚠️     |   ⚠️    |   ⚠️   |   ⚠️   |

### 2.6 Marketplace

| Ruta Marketplace       | admin | team_leader | strategist | trafficker | creator | editor | client |
|-----------------------|:-----:|:-----------:|:----------:|:----------:|:-------:|:------:|:------:|
| `/marketplace` (browse)|  ✅   |     ✅      |     ✅     |     ❌*    |   ✅    |   ❌*  |   ✅   |
| `/marketplace/campaigns`| ⚠️  |     ⚠️      |     ⚠️     |     ⚠️     |   ⚠️    |   ⚠️   |   ⚠️   |
| `/marketplace/hire/*` |  ⚠️   |     ⚠️      |     ⚠️     |     ⚠️     |   ⚠️    |   ⚠️   |   ⚠️   |
| `/marketplace/talent-lists`| ⚠️|    ⚠️      |     ⚠️     |     ⚠️     |   ⚠️    |   ⚠️   |   ⚠️   |

**Notas**:
- `❌*` = Bloqueado por config de organización (`marketplaceEnabled=false`)
- Browse routes son accesibles para reclutamiento de talento incluso con marketplace deshabilitado

### 2.7 Streaming & Live (AdminOnlyFeature)

| Ruta                   | admin | team_leader | strategist | trafficker | creator | editor | client |
|-----------------------|:-----:|:-----------:|:----------:|:----------:|:-------:|:------:|:------:|
| `/streaming`          |  ✅   |     🚧      |     🚧     |     🚧     |   🚧    |   🚧   |   🚧   |
| `/streaming/studio/*` |  ✅   |     🚧      |     🚧     |     🚧     |   🚧    |   🚧   |   🚧   |
| `/live`               |  ✅   |     🚧      |     🚧     |     🚧     |   🚧    |   🚧   |   🚧   |
| `/live/broadcast`     |  ✅   |     🚧      |     🚧     |     🚧     |   🚧    |   🚧   |   🚧   |

**Nota**: 🚧 = Muestra página "En Construcción" para no-admins

---

## 3. Tokens AI por Tier de Suscripción

### 3.1 Asignación Mensual de Tokens

| Tier               | Tokens/mes | Público Objetivo           | Precio Aprox. |
|-------------------|:----------:|---------------------------|---------------|
| `brand_free`      |    300     | Nuevos usuarios (marcas)   | $0            |
| `brand_starter`   |   4,000    | Marcas pequeñas           | ~$29/mes      |
| `brand_pro`       |  12,000    | Marcas medianas           | ~$99/mes      |
| `brand_business`  |  40,000    | Marcas grandes            | ~$299/mes     |
| `creator_free`    |    800     | Creadores nuevos          | $0            |
| `creator_pro`     |   6,000    | Creadores profesionales   | ~$49/mes      |
| `org_starter`     |  20,000    | Agencias pequeñas         | ~$199/mes     |
| `org_pro`         |  60,000    | Agencias medianas         | ~$499/mes     |
| `org_enterprise`  | 200,000    | Agencias enterprise       | Custom        |

### 3.2 Costos por Acción de IA

| Acción                    | Tokens | Categoría      |
|--------------------------|:------:|----------------|
| `research.full`          |  600   | Research       |
| `dna.full_analysis`      |  500   | Analysis       |
| `dna.project_analysis`   |  400   | Analysis       |
| `ads.generate_banner`    |  200   | Ads            |
| `board.research_context` |  150   | Board AI       |
| `live.generate`          |  150   | Live           |
| `scripts.generate`       |  120   | Content        |
| `content.generate_script`|  120   | Content        |
| `talent.suggest_creator` |  120   | Talent         |
| `research.phase`         |  100   | Research       |
| `board.analyze_board`    |  100   | Board AI       |
| `board.analyze_card`     |   80   | Board AI       |
| `talent.match`           |   60   | Talent         |
| `scripts.improve`        |   60   | Content        |
| `portfolio.bio`          |   50   | Portfolio      |
| `content.analyze`        |   40   | Content        |
| `board.suggestions`      |   40   | Board AI       |
| `board.prioritize`       |   40   | Board AI       |
| `ads.generate_copy`      |   40   | Ads            |
| `scripts.block.*`        | 15-25  | Scripts        |
| `portfolio.caption`      |   25   | Portfolio      |
| `script_chat`            |   20   | Content        |
| `transcription`          |   15   | Utility        |

### 3.3 Bypass de Tokens

```typescript
// custom_api_enabled = true → No consume tokens del plan
// organization_ai_tokens.custom_api_enabled permite conectar API keys propias
```

---

## 4. Flujo de Autenticación y Gates

### 4.1 Jerarquía de Verificaciones (ProtectedRoute)

```
1. Usuario autenticado?
   └─ NO → Redirect /auth

2. Platform Root sin org seleccionada?
   └─ SI + ruta requiere org → Redirect /no-organization

3. Root Admin impersonando?
   └─ SI → Bypass la mayoría de checks, usar roles del impersonado

4. requirePlatformAdmin?
   └─ SI + !isPlatformAdmin → Redirect a dashboard apropiado

5. profile.organization_status === 'pending_assignment'?
   └─ SI → Redirect /pending-access

6. TalentGate (referral gate)?
   └─ Talent sin platform_access_unlocked → Redirect /unlock-access

7. Usuario sin roles (roles.length === 0)?
   └─ Solo puede acceder a SOCIAL_ROUTES + FREELANCE_ALLOWED_ROUTES/CLIENT_ALLOWED_ROUTES

8. Cliente sin empresa asociada?
   └─ Solo SOCIAL_ROUTES → Redirect /no-company

9. Marketplace bloqueado por config de org?
   └─ Redirect a dashboard apropiado

10. Verificar allowedRoles por PermissionGroup
```

### 4.2 Gates Especiales

| Gate                  | Ubicación                          | Función                                |
|----------------------|-----------------------------------|----------------------------------------|
| `ProtectedRoute`     | `src/components/ProtectedRoute.tsx` | Gate principal de rutas protegidas    |
| `TalentGate`         | `src/components/TalentGate.tsx`     | Bloquea talents sin referrals         |
| `AdminOnlyFeature`   | `src/components/common/AdminOnlyFeature.tsx` | Features en construcción   |
| `OnboardingGateProvider` | `src/providers/OnboardingGateProvider.tsx` | Flujo de onboarding    |
| `RoleLegalGateProvider` | `src/providers/RoleLegalGateProvider.tsx` | Consentimientos legales   |

### 4.3 Rutas de Acceso Libre (No requieren roles)

```typescript
const SOCIAL_ROUTES = ['/social', '/marketplace', '/explore', '/profile', '/settings'];
const FREELANCE_ALLOWED_ROUTES = ['/board', '/scripts', '/freelancer-dashboard', '/social-hub', '/wallet', '/planes'];
const CLIENT_ALLOWED_ROUTES = ['/client-dashboard', '/board', '/marketplace', '/wallet', '/planes', '/social-hub', '/live', '/marketing-ads', '/ad-generator'];
const ORG_REQUIRED_ROUTES = ['/dashboard', '/board', '/content', '/talent', '/scripts', '/clients-hub', '/team', '/ranking'];
```

---

## 5. Sistema de Permission Groups

### 5.1 Mapeo de Roles a Permission Groups

```typescript
const ROLE_TO_PERMISSION_GROUP = {
  // System roles
  admin: 'admin',
  team_leader: 'team_leader',

  // Global roles
  creator: 'creator',
  editor: 'editor',
  strategist: 'strategist',
  client: 'client',
  developer: 'creator',      // ← Mapea a creator
  educator: 'creator',       // ← Mapea a creator
  ambassador: 'creator',     // ← Deprecated, mapea a creator
  trafficker: 'strategist',  // ← Deprecated, mapea a strategist

  // 36 Marketplace specializations → sus grupos respectivos
  // Ver src/lib/permissionGroups.ts para lista completa
};
```

### 5.2 Dashboard por Permission Group

```typescript
const GROUP_DASHBOARD_PATHS = {
  admin: '/dashboard',
  team_leader: '/dashboard',
  strategist: '/strategist-dashboard',
  creator: '/creator-dashboard',
  editor: '/editor-dashboard',
  client: '/client-dashboard',
};
```

---

## 6. Sistema de Prioridad de Roles

### 6.1 Orden de Prioridad

```typescript
const FUNCTIONAL_ROLES = ['admin', 'team_leader', 'strategist', 'trafficker', 'creator', 'editor', 'client'];
// admin tiene la mayor prioridad, client la menor
```

### 6.2 Selección de Rol Activo

1. **DB**: `profile.active_role` (si es válido y funcional)
2. **Admin Check**: Si tiene rol `admin`, usar admin
3. **localStorage**: Si coincide con roles del usuario
4. **Default**: Primer rol por prioridad

**IMPORTANTE**: `ambassador` NUNCA puede ser `active_role` (es un badge, no un rol funcional)

---

## 7. Identificación de Gaps y Recomendaciones

### 7.1 Gaps Identificados

| #  | Gap                                      | Severidad | Descripción                                      |
|----|------------------------------------------|-----------|--------------------------------------------------|
| 1  | `/admin/ad-intelligence` sin protección  | ⚠️ Media  | Usa `allowNoRoles` en lugar de `allowedRoles=['admin']` |
| 2  | `/admin/social-scraper` sin protección   | ⚠️ Media  | Usa `allowNoRoles` en lugar de `allowedRoles=['admin']` |
| 3  | `trafficker` deprecado pero aún en uso   | 📋 Baja   | Mapea a `strategist`, considerar migración      |
| 4  | `ambassador` confuso                     | 📋 Baja   | Es badge pero aparece en arrays de roles        |
| 5  | Roles sin dashboard específico           | 📋 Baja   | `developer`, `educator` usan creator-dashboard  |

### 7.2 Recomendaciones

#### Alta Prioridad
1. **Corregir rutas /admin/* con allowNoRoles**
   ```typescript
   // Cambiar de:
   <Route path="/admin/ad-intelligence" element={<ProtectedRoute allowNoRoles>...} />
   // A:
   <Route path="/admin/ad-intelligence" element={<ProtectedRoute allowedRoles={['admin']}>...} />
   ```

#### Media Prioridad
2. **Migrar `trafficker` a `strategist`**
   - Ya mapea a permission group `strategist`
   - Considerar deprecación completa en UI

3. **Clarificar `ambassador` en documentación**
   - Es un badge/privilege almacenado en `organization_member_badges`
   - NO es un rol funcional para permisos

#### Baja Prioridad
4. **Dashboards dedicados** para `developer` y `educator`
5. **Audit logging** para cambios de rol

---

## 8. Archivos Clave del Sistema RBAC

| Archivo                                      | Propósito                                    |
|---------------------------------------------|----------------------------------------------|
| `src/lib/roles.ts`                          | Labels, colores, funciones helper de roles   |
| `src/lib/permissionGroups.ts`               | Mapeo de 44 roles → 6 permission groups     |
| `src/types/roles.ts`                        | TypeScript types para roles y grupos        |
| `src/hooks/useAuth.tsx`                     | Context de autenticación y roles            |
| `src/components/ProtectedRoute.tsx`         | Gate principal de rutas protegidas          |
| `src/components/TalentGate.tsx`             | Gate de referrals para talents              |
| `src/components/common/AdminOnlyFeature.tsx`| Gate de features en construcción            |
| `src/components/layout/RoleSwitcher.tsx`    | UI para cambiar entre roles múltiples       |
| `supabase/functions/_shared/ai-token-guard.ts` | Middleware de verificación de tokens AI  |
| `supabase/functions/ai-tokens-service/index.ts` | Service de gestión de tokens AI         |

---

## 9. Constantes ROOT_EMAILS

```typescript
// Emails con acceso root (bypass de verificaciones)
const ROOT_EMAILS = ["jacsolucionesgraficas@gmail.com", "kairosgp.sas@gmail.com"];
```

Estos emails:
- Se detectan como `isPlatformAdmin` automáticamente
- Pueden impersonar cualquier usuario
- Tienen acceso a CRM de plataforma
- Bypass del referral gate

---

## 10. Changelog

| Fecha      | Versión | Cambios                                           |
|------------|---------|---------------------------------------------------|
| 2026-03-27 | 1.0     | Auditoría inicial del sistema RBAC               |

---

*Documento generado automáticamente por RBAC-Auditor Agent*
