# 🔐 SQL para configurar RLS en Kreoon

Ejecuta este script en el SQL Editor de tu proyecto Kreoon:
https://supabase.com/dashboard/project/wjkbqcrxwsmvtxmqgiqc/sql/new

---

```sql
-- ============================================
-- KREOON RLS POLICIES - CONFIGURACIÓN COMPLETA
-- ============================================

-- 1. PROFILES - Usuarios pueden leer su propio perfil y los de su organización
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;

CREATE POLICY "Authenticated can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 2. ORGANIZATIONS
DROP POLICY IF EXISTS "Authenticated can view organizations" ON public.organizations;
DROP POLICY IF EXISTS "Members can view their organization" ON public.organizations;

CREATE POLICY "Authenticated can view organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Org owners can update"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. ORGANIZATION_MEMBERS
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;

CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can manage members"
  ON public.organization_members FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'team_leader')
    )
  );

-- 4. ORGANIZATION_MEMBER_ROLES
DROP POLICY IF EXISTS "Members can view roles" ON public.organization_member_roles;

CREATE POLICY "Members can view roles"
  ON public.organization_member_roles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can manage roles"
  ON public.organization_member_roles FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 5. USER_ROLES (platform-level roles)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 6. CLIENTS
DROP POLICY IF EXISTS "Authenticated can view clients" ON public.clients;

CREATE POLICY "Authenticated can view clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
    OR id IN (
      SELECT client_id FROM public.client_users WHERE user_id = auth.uid()
    )
    OR is_public = true
  );

CREATE POLICY "Org members can manage clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'team_leader', 'strategist')
    )
  );

-- 7. CLIENT_USERS
DROP POLICY IF EXISTS "Users can view client associations" ON public.client_users;

CREATE POLICY "Users can view client associations"
  ON public.client_users FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR client_id IN (
      SELECT client_id FROM public.client_users WHERE user_id = auth.uid()
    )
  );

-- 8. PRODUCTS
DROP POLICY IF EXISTS "Authenticated can view products" ON public.products;

CREATE POLICY "Authenticated can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
    OR client_id IN (
      SELECT client_id FROM public.client_users WHERE user_id = auth.uid()
    )
  );

-- 9. CONTENT
DROP POLICY IF EXISTS "Org members can view content" ON public.content;

CREATE POLICY "Org members can view content"
  ON public.content FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
    OR creator_id = auth.uid()
    OR editor_id = auth.uid()
  );

CREATE POLICY "Org members can manage content"
  ON public.content FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- 10. APP_SETTINGS (public read)
DROP POLICY IF EXISTS "Anyone can read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public can read app_settings" ON public.app_settings;

CREATE POLICY "Anyone can read app_settings"
  ON public.app_settings FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can update app_settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 11. ACHIEVEMENTS (public read)
DROP POLICY IF EXISTS "Anyone can read achievements" ON public.achievements;

CREATE POLICY "Anyone can read achievements"
  ON public.achievements FOR SELECT
  TO authenticated, anon
  USING (true);

-- 12. CLIENT_PACKAGES
DROP POLICY IF EXISTS "Org members can view packages" ON public.client_packages;

CREATE POLICY "Org members can view packages"
  ON public.client_packages FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- 13. CHAT_CONVERSATIONS
DROP POLICY IF EXISTS "Participants can view conversations" ON public.chat_conversations;

CREATE POLICY "Participants can view conversations"
  ON public.chat_conversations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM public.chat_participants WHERE user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- 14. CHAT_PARTICIPANTS
DROP POLICY IF EXISTS "Users can view their participation" ON public.chat_participants;

CREATE POLICY "Users can view their participation"
  ON public.chat_participants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR conversation_id IN (
      SELECT conversation_id FROM public.chat_participants WHERE user_id = auth.uid()
    )
  );

-- 15. CHAT_MESSAGES
DROP POLICY IF EXISTS "Participants can view messages" ON public.chat_messages;

CREATE POLICY "Participants can view messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.chat_participants WHERE user_id = auth.uid()
    )
  );

-- 16. NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

---

## Después de ejecutar el SQL

1. Cierra sesión en la app (https://kreoon.com)
2. Inicia sesión con: jacsolucionesgraficas@gmail.com / Kreoon2026!
3. Deberías poder acceder al dashboard normalmente

---

## Si aún hay problemas

Ejecuta esto para verificar que tu usuario existe correctamente:

```sql
-- Verificar usuario root
SELECT id, email, full_name, current_organization_id 
FROM public.profiles 
WHERE email = 'jacsolucionesgraficas@gmail.com';

-- Verificar roles
SELECT * FROM public.user_roles 
WHERE user_id = '577c72dc-f088-4e99-a109-e88e035a0540';

-- Verificar membresía de organización
SELECT * FROM public.organization_members 
WHERE user_id = '577c72dc-f088-4e99-a109-e88e035a0540';

SELECT * FROM public.organization_member_roles 
WHERE user_id = '577c72dc-f088-4e99-a109-e88e035a0540';
```
