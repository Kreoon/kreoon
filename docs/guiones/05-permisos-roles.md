# Sistema de Permisos por Rol - Constructor de Guiones

## Visión General

El sistema de permisos del constructor de guiones es dinámico y configurable por organización. Cada rol tiene acceso diferente a las pestañas/bloques del guión.

---

## Matriz de Permisos por Defecto

| TAB | ADMIN | STRATEGIST | CREATOR | EDITOR | DESIGNER | TRAFFICKER | CLIENT |
|-----|-------|------------|---------|--------|----------|------------|--------|
| **IA** | VEG | VEG | - | - | - | - | - |
| **Script** | VEA | VE | VE | V | V | V | VA |
| **Editor** | VE | VE | V | VE | V | V | - |
| **Strategist** | VE | VE | V | V | V | V | - |
| **Designer** | VE | VE | V | V | VE | V | - |
| **Trafficker** | VE | VE | - | - | - | VE | - |
| **Admin** | VEL | - | - | - | - | - | - |

**Leyenda:**
- **V** = View (Ver)
- **E** = Edit (Editar)
- **G** = Generate (Generar con IA)
- **A** = Approve (Aprobar)
- **L** = Lock (Bloquear)

---

## Detalle por Rol

### Admin

**Acceso completo al sistema:**
- Ver, editar y generar en todas las pestañas
- Aprobar guiones del creador
- Bloquear guiones para evitar cambios
- Acceso a configuración de prompts
- Ver métricas y logs de uso de IA

### Strategist (Estratega)

**Acceso amplio con enfoque estratégico:**
- Ver y editar todas las pestañas excepto Admin
- Generar contenido con IA
- No puede aprobar ni bloquear
- Enfocado en análisis y optimización

### Creator (Creador)

**Enfocado en producción de guiones:**
- Ver y editar el guión principal (Script)
- Ver pestañas de otros roles (lectura)
- No tiene acceso a IA ni Trafficker
- Responsable de la ejecución del contenido

### Editor

**Especializado en post-producción:**
- Ver todo, editar solo su bloque (Editor)
- Recibe el guión y agrega pautas técnicas
- No tiene acceso a generación ni Trafficker

### Designer (Diseñador)

**Enfocado en visual:**
- Ver todo, editar solo su bloque (Designer)
- Agrega pautas de diseño y recursos
- No tiene acceso a generación ni Trafficker

### Trafficker

**Especializado en pauta:**
- Ver solo Script y su propio bloque
- Editar solo Trafficker
- Agrega configuración de campañas
- No ve bloques de otros roles

### Client (Cliente)

**Acceso limitado de revisión:**
- Ver el guión principal
- Aprobar el guión (flujo de aprobación)
- No puede editar ni generar
- No ve bloques internos del equipo

---

## Implementación Técnica

### Tabla de Permisos

```sql
CREATE TABLE public.script_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  role TEXT NOT NULL,
  
  -- Permisos por tab: IA
  ia_view BOOLEAN DEFAULT false,
  ia_edit BOOLEAN DEFAULT false,
  ia_generate BOOLEAN DEFAULT false,
  
  -- Permisos por tab: Script
  script_view BOOLEAN DEFAULT false,
  script_edit BOOLEAN DEFAULT false,
  script_approve BOOLEAN DEFAULT false,
  
  -- Permisos por tab: Editor
  editor_view BOOLEAN DEFAULT false,
  editor_edit BOOLEAN DEFAULT false,
  
  -- Permisos por tab: Strategist
  strategist_view BOOLEAN DEFAULT false,
  strategist_edit BOOLEAN DEFAULT false,
  
  -- Permisos por tab: Designer
  designer_view BOOLEAN DEFAULT false,
  designer_edit BOOLEAN DEFAULT false,
  
  -- Permisos por tab: Trafficker
  trafficker_view BOOLEAN DEFAULT false,
  trafficker_edit BOOLEAN DEFAULT false,
  
  -- Permisos por tab: Admin
  admin_view BOOLEAN DEFAULT false,
  admin_edit BOOLEAN DEFAULT false,
  admin_lock BOOLEAN DEFAULT false,
  
  -- Overrides por estado del contenido
  status_overrides JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, role)
);
```

### Tipos TypeScript

```typescript
// Ubicación: src/components/content/ContentDetailDialog/scripts/types.ts

export type ScriptSubTab = 
  | 'ia' 
  | 'script' 
  | 'editor' 
  | 'strategist' 
  | 'designer' 
  | 'trafficker' 
  | 'admin';

export interface ScriptPermissions {
  ia: { view: boolean; edit: boolean; generate: boolean };
  script: { view: boolean; edit: boolean; approve: boolean };
  editor: { view: boolean; edit: boolean };
  strategist: { view: boolean; edit: boolean };
  designer: { view: boolean; edit: boolean };
  trafficker: { view: boolean; edit: boolean };
  admin: { view: boolean; edit: boolean; lock: boolean };
}

export interface ScriptPermissionsWithHelpers extends ScriptPermissions {
  canView: (tab: ScriptSubTab) => boolean;
  canEdit: (tab: ScriptSubTab) => boolean;
  canGenerate: () => boolean;
  canApprove: () => boolean;
  canLock: () => boolean;
  visibleTabs: ScriptSubTab[];
}
```

### Permisos por Defecto

```typescript
export const DEFAULT_PERMISSIONS: Record<string, ScriptPermissions> = {
  admin: {
    ia: { view: true, edit: true, generate: true },
    script: { view: true, edit: true, approve: true },
    editor: { view: true, edit: true },
    strategist: { view: true, edit: true },
    designer: { view: true, edit: true },
    trafficker: { view: true, edit: true },
    admin: { view: true, edit: true, lock: true },
  },
  strategist: {
    ia: { view: true, edit: true, generate: true },
    script: { view: true, edit: true, approve: false },
    editor: { view: true, edit: true },
    strategist: { view: true, edit: true },
    designer: { view: true, edit: true },
    trafficker: { view: true, edit: true },
    admin: { view: false, edit: false, lock: false },
  },
  creator: {
    ia: { view: false, edit: false, generate: false },
    script: { view: true, edit: true, approve: false },
    editor: { view: true, edit: false },
    strategist: { view: true, edit: false },
    designer: { view: true, edit: false },
    trafficker: { view: false, edit: false },
    admin: { view: false, edit: false, lock: false },
  },
  editor: {
    ia: { view: false, edit: false, generate: false },
    script: { view: true, edit: false, approve: false },
    editor: { view: true, edit: true },
    strategist: { view: true, edit: false },
    designer: { view: true, edit: false },
    trafficker: { view: true, edit: false },
    admin: { view: false, edit: false, lock: false },
  },
  designer: {
    ia: { view: false, edit: false, generate: false },
    script: { view: true, edit: false, approve: false },
    editor: { view: true, edit: false },
    strategist: { view: true, edit: false },
    designer: { view: true, edit: true },
    trafficker: { view: true, edit: false },
    admin: { view: false, edit: false, lock: false },
  },
  trafficker: {
    ia: { view: false, edit: false, generate: false },
    script: { view: true, edit: false, approve: false },
    editor: { view: true, edit: false },
    strategist: { view: true, edit: false },
    designer: { view: true, edit: false },
    trafficker: { view: true, edit: true },
    admin: { view: false, edit: false, lock: false },
  },
  client: {
    ia: { view: false, edit: false, generate: false },
    script: { view: true, edit: false, approve: true },
    editor: { view: false, edit: false },
    strategist: { view: false, edit: false },
    designer: { view: false, edit: false },
    trafficker: { view: false, edit: false },
    admin: { view: false, edit: false, lock: false },
  },
};
```

---

## Hook de Permisos

### useScriptPermissions

```typescript
// Ubicación: src/components/content/ContentDetailDialog/scripts/useScriptPermissions.ts

export function useScriptPermissions(
  organizationId: string,
  userRole: string,
  contentStatus?: string
): ScriptPermissionsWithHelpers {
  const [permissions, setPermissions] = useState<ScriptPermissions | null>(null);

  useEffect(() => {
    async function loadPermissions() {
      // 1. Intentar cargar de DB
      const { data } = await supabase
        .from('script_permissions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('role', userRole)
        .single();

      if (data) {
        // 2. Aplicar overrides por status si existen
        let perms = mapDbToPermissions(data);
        if (contentStatus && data.status_overrides?.[contentStatus]) {
          perms = applyStatusOverrides(perms, data.status_overrides[contentStatus]);
        }
        setPermissions(perms);
      } else {
        // 3. Fallback a permisos por defecto
        setPermissions(DEFAULT_PERMISSIONS[userRole] || DEFAULT_PERMISSIONS.client);
      }
    }

    loadPermissions();
  }, [organizationId, userRole, contentStatus]);

  // Helper functions
  const canView = (tab: ScriptSubTab) => permissions?.[tab]?.view ?? false;
  const canEdit = (tab: ScriptSubTab) => permissions?.[tab]?.edit ?? false;
  const canGenerate = () => permissions?.ia?.generate ?? false;
  const canApprove = () => permissions?.script?.approve ?? false;
  const canLock = () => permissions?.admin?.lock ?? false;

  const visibleTabs = Object.entries(permissions || {})
    .filter(([_, perms]) => perms.view)
    .map(([tab]) => tab as ScriptSubTab);

  return {
    ...permissions,
    canView,
    canEdit,
    canGenerate,
    canApprove,
    canLock,
    visibleTabs,
  };
}
```

---

## Overrides por Estado

El sistema permite modificar permisos según el estado del contenido:

```typescript
// Ejemplo de status_overrides en DB
{
  "approved": {
    "script": { "edit": false },
    "editor": { "edit": false }
  },
  "locked": {
    "script": { "edit": false },
    "editor": { "edit": false },
    "strategist": { "edit": false },
    "trafficker": { "edit": false }
  },
  "in_review": {
    "script": { "edit": false }
  }
}
```

### Estados que Afectan Permisos

| Estado | Efecto |
|--------|--------|
| `draft` | Permisos normales |
| `in_review` | Creador no puede editar |
| `approved` | Solo admin puede editar |
| `locked` | Nadie puede editar |
| `published` | Solo admin puede desbloquear |

---

## Configuración por Organización

Admins pueden personalizar permisos en **Settings > Roles > Script Permissions**:

1. Seleccionar rol a configurar
2. Marcar/desmarcar permisos por pestaña
3. Configurar overrides por estado
4. Guardar cambios

Los cambios se guardan en `script_permissions` y se aplican inmediatamente.
