# 📤 Guía de Exportación de Datos via CSV

## Método Alternativo (Más Simple)

Si dblink no funciona o prefieres un método más directo, sigue estos pasos:

---

## PASO 1: Exportar desde Lovable Cloud

1. Ve a **Cloud View** en tu proyecto Lovable
2. Navega a **Database > Tables**
3. Para cada tabla, haz clic en **Export** (icono de descarga)

### Tablas a exportar (en orden de dependencias):

```
1. organizations
2. profiles  
3. clients
4. products
5. client_packages
6. content
7. organization_members
8. organization_member_roles
9. organization_member_badges
10. up_creadores
11. up_creadores_totals
12. up_editores
13. up_editores_totals
14. chat_conversations
15. chat_participants
16. chat_messages
17. notifications
18. payments
19. content_history
20. content_comments
21. ai_assistant_config
22. ai_assistant_knowledge
23. board_settings
24. board_permissions
```

---

## PASO 2: Importar en Kreoon

### Opción A: Via Supabase Dashboard

1. Ve a https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc
2. Navega a **Table Editor**
3. Selecciona la tabla
4. Haz clic en **Insert** > **Import data from CSV**
5. Sube el archivo CSV correspondiente

### Opción B: Via SQL Editor

```sql
-- Desactivar foreign keys primero
SET session_replication_role = 'replica';

-- Después de importar todos los CSVs
SET session_replication_role = 'origin';
```

---

## PASO 3: Migrar Usuarios de Auth

Los usuarios de `auth.users` NO se exportan con CSV. Usa este script Node.js:

```javascript
// migrate-users.js
const { createClient } = require('@supabase/supabase-js');

// Cliente origen (Lovable Cloud) - Solo lectura
const sourceUrl = 'https://hfooshsteglylhvrpuka.supabase.co';
const sourceKey = 'SERVICE_ROLE_KEY_LOVABLE'; // Obtener de Settings > API

// Cliente destino (Kreoon)
const destUrl = 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co';
const destKey = 'SERVICE_ROLE_KEY_KREOON'; // Obtener de Settings > API

const sourceSupabase = createClient(sourceUrl, sourceKey);
const destSupabase = createClient(destUrl, destKey);

async function migrateUsers() {
  // Obtener todos los profiles con emails
  const { data: profiles, error } = await sourceSupabase
    .from('profiles')
    .select('id, email, full_name');
  
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log(`Found ${profiles.length} users to migrate`);

  for (const profile of profiles) {
    try {
      // Crear usuario en destino
      const { data, error: createError } = await destSupabase.auth.admin.createUser({
        email: profile.email,
        email_confirm: true,
        user_metadata: {
          full_name: profile.full_name
        },
        // El usuario deberá usar "Recuperar contraseña" para acceder
      });

      if (createError) {
        console.log(`User ${profile.email}: ${createError.message}`);
      } else {
        console.log(`✓ Created: ${profile.email}`);
      }
    } catch (e) {
      console.error(`Error creating ${profile.email}:`, e.message);
    }
  }
}

migrateUsers();
```

---

## PASO 4: Actualizar URLs de Storage

Después de migrar storage, ejecuta:

```sql
-- Actualizar URLs de avatares
UPDATE profiles 
SET avatar_url = REPLACE(avatar_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE avatar_url LIKE '%hfooshsteglylhvrpuka%';

-- Logos de organizaciones
UPDATE organizations 
SET logo_url = REPLACE(logo_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE logo_url LIKE '%hfooshsteglylhvrpuka%';

-- Logos de clientes
UPDATE clients 
SET logo_url = REPLACE(logo_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE logo_url LIKE '%hfooshsteglylhvrpuka%';

-- Thumbnails y videos de contenido
UPDATE content 
SET 
  thumbnail_url = REPLACE(thumbnail_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc'),
  video_url = REPLACE(video_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE 
  thumbnail_url LIKE '%hfooshsteglylhvrpuka%' 
  OR video_url LIKE '%hfooshsteglylhvrpuka%';
```

---

## PASO 5: Verificar Migración

```sql
SELECT 'organizations' as tabla, COUNT(*) as registros FROM organizations
UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'content', COUNT(*) FROM content
UNION ALL SELECT 'products', COUNT(*) FROM products;
```

---

## Checklist Final

- [ ] Organizations migradas
- [ ] Profiles migrados
- [ ] Usuarios auth creados (con reset de password)
- [ ] Clients migrados
- [ ] Products migrados
- [ ] Content migrado
- [ ] Organization members migrados
- [ ] UP points migrados
- [ ] Chat migrado
- [ ] Notifications migradas
- [ ] Storage migrado
- [ ] URLs actualizadas
- [ ] Frontend apuntando a Kreoon
