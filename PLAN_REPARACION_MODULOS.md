# Plan de Reparación Módulo por Módulo - Post Migración Kreoon

## Objetivo
Reparar el proyecto después de la migración de base de datos, abordando cada módulo de forma sistemática para identificar y corregir archivos rotos y funciones que ya no operan correctamente.

---

## Orden Recomendado de Reparación

Reparar en este orden para minimizar dependencias rotas entre módulos:

| # | Módulo | Archivos clave | Prioridad | Razón |
|---|--------|----------------|-----------|-------|
| 1 | **Auth / Autenticación** | `useAuth`, `Auth.tsx`, `ProtectedRoute` | CRÍTICA | Base de todo el sistema |
| 2 | **Organizaciones** | `useOrganizations`, `RootOrgSwitcher` | CRÍTICA | Contexto multi-org |
| 3 | **Perfiles / Profiles** | `useProfile`, `profiles` table | ALTA | Datos de usuario |
| 4 | **Clientes** | `Clients.tsx`, hooks de clientes | ALTA | Core del negocio |
| 5 | **Contenido** | `Content.tsx`, `ContentBoard`, hooks de content | ALTA | Funcionalidad principal |
| 6 | **Creadores / Team** | `Creators.tsx`, `CreatorDashboard` | ALTA | Gestión de talento |
| 7 | **Dashboard** | `Dashboard.tsx`, KPIs, metas | MEDIA | Vistas resumen |
| 8 | **Marketing** | `Marketing.tsx`, campañas, calendario | MEDIA | Módulo independiente |
| 9 | **Puntos / UP / Achievements** | `points/`, `useAchievements` | MEDIA | Sistema de gamificación |
| 10 | **Portfolio / Social** | Feed, perfil público, followers | MEDIA | Funcionalidad social |
| 11 | **Live Streaming** | `Live.tsx`, eventos Kreoon | MEDIA | Streaming |
| 12 | **Chat** | Componentes de chat | BAJA | Depende de otros |
| 13 | **Configuración** | `Settings`, secciones | BAJA | Muchas subsecciones |
| 14 | **Scripts / AI** | Generadores de guiones | BAJA | Depende de content |

---

## Checklist por Módulo

Para cada módulo, ejecutar:

### Diagnóstico
- [ ] Ejecutar la app (`npm run dev`) y navegar al módulo
- [ ] Revisar consola del navegador (errores JavaScript)
- [ ] Revisar Network tab (llamadas 400/500 a Supabase)
- [ ] Verificar que las tablas existan en Supabase (SQL Editor)
- [ ] Comparar tipos en `src/types/database.ts` vs schema real

### Tipos de errores comunes post-migración
1. **Tabla/columna no existe** → Revisar migraciones, actualizar queries
2. **RLS deniega acceso** → Revisar políticas en `supabase/migrations`
3. **Foreign key violation** → Datos huérfanos o referencias incorrectas
4. **Tipo TypeScript incorrecto** → Regenerar types o ajustar `types.ts`
5. **View/function eliminada** → Buscar reemplazo en migraciones

### Reparación
- [ ] Corregir imports y queries
- [ ] Actualizar tipos si el schema cambió
- [ ] Ajustar RLS si es necesario (crear migración)
- [ ] Probar flujo completo del módulo
- [ ] Marcar módulo como ✅ en este documento

---

## Cómo Diagnosticar un Módulo Roto

### 1. Identificar las tablas que usa
```bash
# Buscar referencias a Supabase en el módulo
rg "\.from\(|\.select\(|\.insert\(|\.update\(|\.upsert\(" src/pages/NombreModulo.tsx src/components/modulo/
```

### 2. Verificar schema en Supabase
- Ir a: https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc/editor
- Confirmar que las tablas tienen las columnas esperadas

### 3. Regenerar tipos (si hay muchas discrepancias)
```bash
npx supabase gen types typescript --project-id wjkbqcrxwsmvtxmqgiqc > src/integrations/supabase/types.ts
```

---

## Módulos - Estado de Reparación

| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth | ✅ Verificado | Build OK, tablas/profiles/roles correctas |
| Organizaciones | ✅ Verificado | Tablas org/members/invitations OK |
| Perfiles | ✅ Verificado | useProfile, profiles OK |
| Clientes | ✅ Verificado | clients, client_users OK |
| Contenido | ✅ Verificado | content table OK |
| Creadores | ✅ Verificado | organization_member_roles OK |
| Dashboard | ✅ Verificado | Build OK |
| Marketing | ✅ Verificado | marketing tables OK |
| Puntos/UP | ✅ Verificado | up_* tables OK |
| Portfolio | ✅ Verificado | feed, followers OK |
| Live | ✅ Verificado | streaming_* OK |
| Chat | ✅ Verificado | chat_* tables OK |
| Settings | ✅ Verificado | settings tables OK |
| Scripts/AI | ✅ Verificado | Edge functions OK |

---

## Comandos Útiles

```bash
# Iniciar desarrollo
npm run dev

# Ver estructura de migraciones
ls supabase/migrations/

# Buscar usos de una tabla
rg "profiles|organization_members" src/ --type ts -l
```

---

## Resultado de la Revisión

✅ **Build del proyecto: OK** (npm run build pasa sin errores TypeScript)

### Verificación realizada
- Todas las tablas usadas por Auth, Org, Perfiles, etc. existen en `types.ts`
- El cliente Supabase apunta a Kreoon (`wjkbqcrxwsmvtxmqgiqc`)
- Trigger `handle_new_user` crea perfiles automáticamente en signup
- Funciones RPC `generate_org_slug`, `generate_registration_link` definidas

### Posibles problemas en RUNTIME (si algo sigue fallando)

| Problema | Causa probable | Solución |
|----------|----------------|----------|
| Login falla / usuarios no encuentran perfil | IDs migrados distintos a auth.users | El código ya tiene fallback por email para root admins |
| RLS bloquea queries | Políticas no aplicadas o incorrectas | Ejecutar migraciones en orden en Supabase SQL Editor |
| Edge Functions fallan | No desplegadas o secrets faltantes | `supabase functions deploy` y configurar secrets |
| Imágenes/URLs rotas | Storage apunta a Lovable Cloud | Actualizar URLs con REPLACE en DB (ver MIGRACION_SUPABASE_COMPLETA.md) |
| Datos vacíos | Migración de datos incompleta | Verificar INSERT de organizations, profiles, etc. |

### Cómo probar cada módulo

1. **Auth**: Login en `/` → debe redirigir al dashboard según rol
2. **Org**: Cambiar org en sidebar (si eres root) → debe recargar contexto
3. **Clientes**: Ir a `/clients` → listar clientes
4. **Contenido**: Ir a `/content` o `/board` → ver contenido
5. **Creadores**: Ir a `/creators` → ver talentos

### Si encuentras un error concreto

Indica: **módulo + mensaje de error** (consola o Network tab) y lo reparo.
