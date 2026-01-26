# 🚀 GUÍA DE MIGRACIÓN COMPLETA - Kreoon a Supabase Propio

## 📊 Resumen de Datos a Migrar
- **172 tablas** en total
- **3 organizaciones**
- **56 perfiles de usuario**
- **15 clientes**
- **201 contenidos**
- **211 archivos de migración**

---

## PASO 1: Ejecutar el Schema (Estructura)

### 1.1 En tu nuevo Supabase (`wjkbqcrxwsmvtxmqgiqc`)

1. Ve a: https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc/sql
2. Crea un nuevo query
3. Ejecuta las migraciones en orden desde la carpeta `supabase/migrations/`

**IMPORTANTE**: Las migraciones deben ejecutarse en orden cronológico (el nombre del archivo indica el orden).

### 1.2 Script para consolidar migraciones (en tu terminal local)

```bash
# Clona tu repo de GitHub
git clone [tu-repo-url]
cd [tu-proyecto]

# Consolida todas las migraciones
cat supabase/migrations/*.sql > migration_completa.sql

# Ahora copia el contenido de migration_completa.sql y ejecútalo en SQL Editor
```

---

## PASO 2: Importar los Datos

Ejecuta estos scripts SQL en el SQL Editor de tu nuevo Supabase **EN ESTE ORDEN EXACTO**:

### ⚠️ ANTES DE EMPEZAR
Desactiva temporalmente las restricciones de foreign key:

```sql
SET session_replication_role = 'replica';
```

### 2.1 Organizations (3 registros)

```sql
INSERT INTO organizations (id, name, slug, logo_url, description, default_role, is_registration_open, registration_code, primary_color, organization_type, timezone, admin_email, admin_name, admin_phone, city, country, address, billing_email, website, instagram, selected_plan, subscription_status, trial_active, trial_started_at, trial_end_date, settings, registration_page_config, registration_require_invite, created_at, updated_at) VALUES
('c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'UGC Colombia', 'ugc-colombia', 'https://hfooshsteglylhvrpuka.supabase.co/storage/v1/object/public/organizations/c8ae6c6d-a15d-46d9-b69e-465f7371595e/logo.jpg?t=1767137076001', '', 'creator', true, '7C34DFD9', '#ffd500', 'agency', 'America/Bogota', 'admin@ugccolombia.com', 'Diana Milena Torres Lopez', '+573113842399', 'Medellin', 'Colombia', 'Carrera 54 #1A - 54 Int 305', 'kairosgp.sas@gmail.com', 'https://ugccolombia.co', 'agenciaugccolombia', 'starter', 'trial', true, '2025-12-29 04:12:26.882413+00', '2026-01-28 04:12:26.882413+00', '{"editor_randomizer_enabled":true}', '{"banner_url":"https://hfooshsteglylhvrpuka.supabase.co/storage/v1/object/public/organizations/c8ae6c6d-a15d-46d9-b69e-465f7371595e/registration-banner.jpg","custom_fields":[],"show_description":true,"show_phone":false,"show_role_selector":false,"welcome_message":"Somos la Agencia #1 de contenido estratégico en Colombia","welcome_title":"Bienvenidos a UGC Colombia"}', true, '2025-12-26 23:01:49.524679+00', '2025-12-30 23:31:48.212232+00'),

('479b48d9-ef42-4982-8d64-a4040ad3104d', 'Grupo effi', 'grupo-effi-mk1ovtpu', NULL, NULL, 'editor', true, '2DF093A2', '#002aff', 'company', 'America/Bogota', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'starter', 'trial', true, '2026-01-05 21:45:19.404533+00', '2026-02-04 21:45:19.404533+00', '{}', '{"custom_fields":[],"show_phone":false,"show_role_selector":false}', true, '2026-01-05 21:45:19.404533+00', '2026-01-05 21:54:05.474544+00'),

('cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'Prueba', 'prueba-mjnl99gg', NULL, NULL, 'creator', true, '065120E6', '#8B5CF6', 'agency', 'America/Bogota', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'starter', 'trial', true, '2025-12-29 04:12:26.882413+00', '2026-01-28 04:12:26.882413+00', '{}', '{"custom_fields":[],"show_description":false,"show_phone":false,"show_role_selector":false}', true, '2025-12-27 00:55:00.97974+00', '2025-12-30 01:09:09.71345+00');
```

### 2.2 Nota sobre Perfiles y Auth.users

⚠️ **IMPORTANTE**: Los perfiles dependen de `auth.users`. Tienes 2 opciones:

**Opción A - Migrar usuarios vía API Admin (Recomendado)**

```javascript
// Script Node.js para migrar usuarios
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://wjkbqcrxwsmvtxmqgiqc.supabase.co',
  'TU_SERVICE_ROLE_KEY' // Obtener de Settings > API > service_role
)

const usuarios = [
  { id: '06aa55b0-61ea-41f0-9708-7a3d322b6795', email: 'jacsolucionesgraficas@gmail.com', password: 'temporal123' },
  // ... agregar todos los usuarios
]

for (const user of usuarios) {
  await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { full_name: user.full_name }
  })
}
```

**Opción B - Los usuarios hacen "Recuperar contraseña"**

Más simple pero requiere que cada usuario recupere su acceso.

---

## PASO 3: Actualizar URLs de Storage

Las URLs de imágenes apuntan al storage de Lovable Cloud (`hfooshsteglylhvrpuka`). Necesitas:

1. Descargar las imágenes del storage actual
2. Subirlas a tu nuevo bucket
3. Actualizar las URLs en la base de datos

```sql
-- Ejemplo: Actualizar URLs de avatares
UPDATE profiles 
SET avatar_url = REPLACE(avatar_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE avatar_url LIKE '%hfooshsteglylhvrpuka%';

-- Logos de organizaciones
UPDATE organizations 
SET logo_url = REPLACE(logo_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE logo_url LIKE '%hfooshsteglylhvrpuka%';
```

---

## PASO 4: Configurar Edge Functions

1. Copia la carpeta `supabase/functions/` de tu proyecto
2. Actualiza los secrets en tu nuevo Supabase:
   - `GOOGLE_AI_API_KEY` (si usas Gemini)
   - `OPENAI_API_KEY` (si usas OpenAI)
   - `BUNNY_API_KEY` (para videos)
   - Otros secrets que uses

---

## PASO 5: Actualizar Frontend

Actualiza tu archivo `.env` (o `.env.local`):

```env
VITE_SUPABASE_URL=https://wjkbqcrxwsmvtxmqgiqc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_6-4kXBtRoxpLWMhRr3fZcQ__QJ_LmTL
VITE_SUPABASE_PROJECT_ID=wjkbqcrxwsmvtxmqgiqc
```

---

## PASO 6: Re-habilitar Foreign Keys

```sql
SET session_replication_role = 'origin';
```

---

## 📝 Lista de Verificación

- [ ] Schema migrado (211 archivos SQL)
- [ ] Organizations insertadas (3)
- [ ] Usuarios creados en auth.users (56)
- [ ] Profiles insertados (56)
- [ ] Organization members insertados
- [ ] Clients insertados (15)
- [ ] Products insertados
- [ ] Content insertado (201)
- [ ] Storage migrado
- [ ] Edge functions desplegadas
- [ ] Secrets configurados
- [ ] Frontend actualizado con nuevas URLs

---

## ⚡ Exportar Todo el Contenido

Para exportar tablas completas en formato CSV desde el Lovable Cloud actual:

1. Ve a Cloud View en tu proyecto Lovable
2. Navega a Database > Tables
3. Selecciona cada tabla
4. Haz clic en Export

---

## 🔗 Links Útiles

- Tu nuevo Supabase: https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc
- SQL Editor: https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc/sql
- API Settings: https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc/settings/api
