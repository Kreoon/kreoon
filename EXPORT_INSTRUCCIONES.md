# 📦 Instrucciones de Exportación de Datos

## Problema con dblink
El método `dblink` no funciona con Lovable Cloud porque no tienes acceso a la contraseña de postgres del proyecto interno.

## ✅ Solución: Exportar via CSV

### Paso 1: Exportar desde Lovable Cloud

1. Ve a **Cloud View** (ícono de nube en la barra lateral)
2. Navega a **Database → Tables**
3. Para cada tabla, haz clic en el **botón de exportar** (ícono ⬇️)
4. Descarga el CSV

### Tablas a exportar (en orden):

| # | Tabla | Registros aprox |
|---|-------|-----------------|
| 1 | `organizations` | 3 |
| 2 | `profiles` | ~22 |
| 3 | `clients` | ~10 |
| 4 | `products` | ~357 |
| 5 | `content` | ~203 |
| 6 | `organization_members` | ~50 |
| 7 | `organization_member_roles` | ~50 |
| 8 | `client_packages` | variable |
| 9 | `chat_conversations` | variable |
| 10 | `chat_messages` | variable |
| 11 | `notifications` | variable |
| 12 | `payments` | variable |

### Paso 2: Importar en Kreoon

1. Ve al **SQL Editor** de tu proyecto Kreoon en Supabase Dashboard
2. Usa el **Table Editor** para importar CSVs
3. O usa este SQL para cada tabla:

```sql
-- Ejemplo para organizations
COPY public.organizations FROM '/path/to/organizations.csv' DELIMITER ',' CSV HEADER;
```

### Paso 3: Actualizar URLs de Storage

Después de importar, ejecuta esto para actualizar las URLs de imágenes:

```sql
-- Actualizar avatar_url en profiles
UPDATE profiles 
SET avatar_url = REPLACE(avatar_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE avatar_url LIKE '%hfooshsteglylhvrpuka%';

-- Actualizar logo_url en organizations
UPDATE organizations 
SET logo_url = REPLACE(logo_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE logo_url LIKE '%hfooshsteglylhvrpuka%';

-- Actualizar logo_url en clients
UPDATE clients 
SET logo_url = REPLACE(logo_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE logo_url LIKE '%hfooshsteglylhvrpuka%';

-- Actualizar thumbnail_url y video_url en content
UPDATE content 
SET thumbnail_url = REPLACE(thumbnail_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc'),
    video_url = REPLACE(video_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE thumbnail_url LIKE '%hfooshsteglylhvrpuka%' 
   OR video_url LIKE '%hfooshsteglylhvrpuka%';
```

## ⚠️ Importante: Usuarios Auth

Los usuarios de `auth.users` NO se pueden exportar via CSV. Opciones:

1. **Recuperación de contraseña**: Los usuarios hacen "Olvidé mi contraseña" en Kreoon
2. **Admin API de Supabase**: Migrar usuarios programáticamente (requiere script Node.js)

## 📋 Checklist Final

- [ ] Exportar organizations
- [ ] Exportar profiles
- [ ] Exportar clients
- [ ] Exportar products
- [ ] Exportar content
- [ ] Exportar organization_members
- [ ] Exportar organization_member_roles
- [ ] Importar todos los CSV en Kreoon
- [ ] Ejecutar script de actualización de URLs
- [ ] Copiar archivos de Storage manualmente
- [ ] Configurar secrets en Kreoon (Bunny, AI APIs)
- [ ] Cambiar cliente Supabase en la app

---

¿Necesitas que genere un script Node.js para migrar los usuarios auth?
