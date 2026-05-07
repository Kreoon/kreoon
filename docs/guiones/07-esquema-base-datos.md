# Esquema de Base de Datos - Constructor de Guiones

## Tablas Principales

### content (Proyectos/Contenidos)

```sql
CREATE TABLE public.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  client_id UUID REFERENCES clients(id),
  creator_id UUID REFERENCES auth.users(id),
  editor_id UUID REFERENCES auth.users(id),
  status content_status DEFAULT 'draft',
  product_id UUID REFERENCES products(id),
  
  -- Campos de guión
  script TEXT,                          -- Bloque 1: Creador
  script_approved_at TIMESTAMPTZ,
  script_approved_by UUID REFERENCES auth.users(id),
  sales_angle TEXT,                     -- Ángulo seleccionado
  sphere_phase sphere_phase,            -- engage/solution/remarketing/fidelize
  
  -- Bloques adicionales
  editor_script TEXT,                   -- Bloque 2: Editor
  strategist_script TEXT,               -- Bloque 4: Estratega
  trafficker_script TEXT,               -- Bloque 3: Trafficker
  designer_script TEXT,                 -- Bloque 5: Diseñador
  admin_script TEXT,                    -- Bloque 6: Admin
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_content_organization ON content(organization_id);
CREATE INDEX idx_content_product ON content(product_id);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_creator ON content(creator_id);
```

### products (Productos)

```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  client_id UUID REFERENCES clients(id),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Estrategia y research
  strategy TEXT,
  market_research TEXT,
  ideal_avatar TEXT,
  sales_angles TEXT[],                  -- Array de ángulos de venta
  
  -- URLs de documentos
  brief_url TEXT,
  onboarding_url TEXT,
  research_url TEXT,
  
  -- Datos estructurados
  avatar_profiles JSONB,                -- Perfiles de avatar detallados
  sales_angles_data JSONB,              -- Datos estructurados de ángulos
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX idx_products_organization ON products(organization_id);
CREATE INDEX idx_products_client ON products(client_id);
```

### script_permissions (Permisos de Guión)

```sql
CREATE TABLE public.script_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
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
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, role)
);

-- Índice
CREATE INDEX idx_script_permissions_org ON script_permissions(organization_id);
```

### organization_ai_prompts (Prompts Personalizados)

```sql
CREATE TABLE public.organization_ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  module_key TEXT NOT NULL,            -- 'scripts', 'research', 'chat', etc.
  prompt_config JSONB NOT NULL,        -- Configuración completa de prompts
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(organization_id, module_key)
);

-- Índice
CREATE INDEX idx_ai_prompts_org_module ON organization_ai_prompts(organization_id, module_key);
```

---

## Enums

### sphere_phase

```sql
CREATE TYPE sphere_phase AS ENUM (
  'engage',      -- TOFU - Enganchar
  'solution',    -- MOFU - Solución
  'remarketing', -- BOFU - Remarketing
  'fidelize'     -- Post-venta - Fidelizar
);
```

### content_status

```sql
CREATE TYPE content_status AS ENUM (
  'draft',       -- Borrador
  'in_review',   -- En revisión
  'approved',    -- Aprobado
  'in_progress', -- En producción
  'completed',   -- Completado
  'published',   -- Publicado
  'archived'     -- Archivado
);
```

---

## Diagrama de Relaciones

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DIAGRAMA DE RELACIONES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  organizations                                                              │
│       │                                                                     │
│       ├──────┬───────────────────────────────────────────────────────       │
│       │      │                                                              │
│       │      ▼                                                              │
│       │   script_permissions (1:N por rol)                                  │
│       │      │                                                              │
│       │      ▼                                                              │
│       │   organization_ai_prompts (1:N por módulo)                          │
│       │      │                                                              │
│       │      ▼                                                              │
│       │   organization_ai_modules (1:N módulos activos)                     │
│       │      │                                                              │
│       │      ▼                                                              │
│       │   organization_ai_providers (1:N providers)                         │
│       │                                                                     │
│       ▼                                                                     │
│    clients ──────── products ──────── content                               │
│       │                 │                 │                                 │
│       │                 │                 ├── script (TEXT)                 │
│       │                 │                 ├── editor_script (TEXT)          │
│       │                 │                 ├── strategist_script (TEXT)      │
│       │                 │                 ├── trafficker_script (TEXT)      │
│       │                 │                 ├── designer_script (TEXT)        │
│       │                 │                 ├── admin_script (TEXT)           │
│       │                 │                 └── sphere_phase (ENUM)           │
│       │                 │                                                   │
│       │                 ├── name, description                               │
│       │                 ├── strategy, market_research                       │
│       │                 ├── ideal_avatar, sales_angles[]                    │
│       │                 └── brief_url, onboarding_url, research_url         │
│       │                                                                     │
│       └── user_id (propietario del cliente)                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Estructura de JSONB

### prompt_config (organization_ai_prompts)

```json
{
  "master_prompt": "Eres un experto en creación de guiones UGC...",
  "role_prompts": {
    "creator": "Genera un guión con hooks, desarrollo y CTA...",
    "editor": "Genera pautas de edición técnica...",
    "strategist": "Genera análisis estratégico...",
    "trafficker": "Genera pautas de pauta...",
    "designer": "Genera pautas de diseño...",
    "admin": "Genera notas del PM..."
  },
  "format_rules": "<h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>",
  "output_rules": "HTML válido, máximo 1-2 emojis, acciones en [CORCHETES]",
  "few_shot_examples": [
    {
      "product": "Crema facial",
      "phase": "solution",
      "output": "<h2>HOOKS</h2>..."
    }
  ]
}
```

### status_overrides (script_permissions)

```json
{
  "approved": {
    "script": { "edit": false },
    "editor": { "edit": false }
  },
  "locked": {
    "script": { "edit": false },
    "editor": { "edit": false },
    "strategist": { "edit": false },
    "trafficker": { "edit": false },
    "designer": { "edit": false }
  },
  "in_review": {
    "script": { "edit": false }
  }
}
```

### avatar_profiles (products)

```json
{
  "primary": {
    "name": "María",
    "age_range": "25-40",
    "gender": "female",
    "location": "Colombia",
    "pains": ["piel grasa", "acné adulto", "falta de tiempo"],
    "desires": ["piel perfecta", "rutina rápida", "verse joven"],
    "objections": ["precio", "si funciona", "ingredientes"],
    "interests": ["skincare", "maquillaje", "selfcare"]
  },
  "secondary": {
    "name": "Carolina",
    "age_range": "40-55",
    "gender": "female",
    "location": "México",
    "pains": ["arrugas", "manchas", "flacidez"],
    "desires": ["rejuvenecer", "naturalidad", "prevención"],
    "objections": ["edad", "efectividad", "tiempo de resultados"],
    "interests": ["anti-aging", "salud", "bienestar"]
  }
}
```

### sales_angles_data (products)

```json
[
  {
    "id": "angle_1",
    "name": "Resultados Rápidos",
    "description": "Enfoque en resultados visibles en 2 semanas",
    "target_consciousness": "product_aware",
    "best_phase": "solution",
    "key_message": "Resultados que puedes ver y sentir"
  },
  {
    "id": "angle_2",
    "name": "Ingredientes Naturales",
    "description": "Enfoque en fórmula natural sin químicos",
    "target_consciousness": "solution_aware",
    "best_phase": "solution",
    "key_message": "La naturaleza al servicio de tu piel"
  },
  {
    "id": "angle_3",
    "name": "Precio vs Valor",
    "description": "Comparación con tratamientos costosos",
    "target_consciousness": "most_aware",
    "best_phase": "remarketing",
    "key_message": "Resultados de spa a fracción del precio"
  }
]
```

---

## RLS Policies

### content

```sql
-- Ver contenido de su organización
CREATE POLICY "Users can view content in their organization"
ON content FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Crear contenido en su organización
CREATE POLICY "Users can create content in their organization"
ON content FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Actualizar contenido según permisos
CREATE POLICY "Users can update content based on permissions"
ON content FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  )
);
```

### products

```sql
-- Ver productos de su organización
CREATE POLICY "Users can view products in their organization"
ON products FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  )
);
```

### script_permissions

```sql
-- Solo admins pueden modificar permisos
CREATE POLICY "Only admins can manage script permissions"
ON script_permissions FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Todos pueden leer permisos de su org
CREATE POLICY "Users can read permissions in their organization"
ON script_permissions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  )
);
```
