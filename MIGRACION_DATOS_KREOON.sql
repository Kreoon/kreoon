-- ============================================================
-- SCRIPT DE EXPORTACIÓN DE DATOS - Lovable Cloud -> Kreoon
-- Proyecto origen: hfooshsteglylhvrpuka (Lovable Cloud)
-- Proyecto destino: wjkbqcrxwsmvtxmqgiqc (Kreoon)
-- Fecha: 2026-01-27
-- ============================================================

-- IMPORTANTE: Este script debe ejecutarse en el SQL Editor
-- de tu proyecto Kreoon (wjkbqcrxwsmvtxmqgiqc)

-- ============================================================
-- PASO 1: DESACTIVAR RESTRICCIONES DE FOREIGN KEY
-- ============================================================
SET session_replication_role = 'replica';

-- ============================================================
-- PASO 2: LIMPIAR TABLAS EXISTENTES (OPCIONAL)
-- Descomenta si necesitas limpiar antes de importar
-- ============================================================
-- TRUNCATE TABLE public.content CASCADE;
-- TRUNCATE TABLE public.profiles CASCADE;
-- TRUNCATE TABLE public.organizations CASCADE;
-- ... etc

-- ============================================================
-- PASO 3: ORGANIZATIONS (TABLAS BASE)
-- ============================================================
-- Exportar desde Lovable Cloud y pegar aquí

INSERT INTO organizations (id, name, slug, logo_url, description, default_role, is_registration_open, registration_code, primary_color, organization_type, timezone, admin_email, admin_name, admin_phone, city, country, address, billing_email, website, instagram, selected_plan, subscription_status, trial_active, trial_started_at, trial_end_date, settings, registration_page_config, registration_require_invite, created_at, updated_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT * FROM public.organizations'
) AS t(
  id uuid, name text, slug text, logo_url text, description text, default_role text, 
  is_registration_open boolean, registration_code text, primary_color text, 
  organization_type text, timezone text, admin_email text, admin_name text, 
  admin_phone text, city text, country text, address text, billing_email text, 
  website text, instagram text, selected_plan text, subscription_status text, 
  trial_active boolean, trial_started_at timestamptz, trial_end_date timestamptz, 
  settings jsonb, registration_page_config jsonb, registration_require_invite boolean, 
  created_at timestamptz, updated_at timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;

-- ============================================================
-- PASO 4: PROFILES (USUARIOS)
-- ============================================================
-- NOTA: Los usuarios de auth.users deben migrarse con la Admin API
-- Este script solo migra la tabla profiles

INSERT INTO profiles (id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at FROM public.profiles'
) AS t(
  id uuid, email text, full_name text, username text, avatar_url text, phone text,
  bio text, is_ambassador boolean, is_public boolean, portfolio_url text, 
  instagram text, tiktok text, facebook text, city text, address text,
  document_type text, document_number text, current_organization_id uuid,
  organization_status text, created_at timestamptz, updated_at timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  updated_at = EXCLUDED.updated_at;

-- ============================================================
-- PASO 5: CLIENTS
-- ============================================================
INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at FROM public.clients'
) AS t(
  id uuid, name text, contact_email text, contact_phone text, logo_url text,
  notes text, user_id uuid, created_by uuid, organization_id uuid, 
  is_internal_brand boolean, is_vip boolean, category text,
  created_at timestamptz, updated_at timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;

-- ============================================================
-- PASO 6: PRODUCTS
-- ============================================================
INSERT INTO products (id, client_id, name, description, strategy, market_research, ideal_avatar, sales_angles, brief_url, onboarding_url, research_url, created_at, updated_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, client_id, name, description, strategy, market_research, ideal_avatar, sales_angles, brief_url, onboarding_url, research_url, created_at, updated_at FROM public.products'
) AS t(
  id uuid, client_id uuid, name text, description text, strategy text,
  market_research text, ideal_avatar text, sales_angles text[],
  brief_url text, onboarding_url text, research_url text,
  created_at timestamptz, updated_at timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;

-- ============================================================
-- PASO 7: CONTENT (CONTENIDOS)
-- ============================================================
INSERT INTO content (id, title, description, script, video_url, thumbnail_url, status, client_id, creator_id, editor_id, creator_payment, editor_payment, is_ambassador_content, is_published, views_count, likes_count, deadline, notes, script_approved_at, script_approved_by, approved_at, approved_by, paid_at, created_at, updated_at, product_id, sales_angle, campaign_week, strategist_id, start_date, invoiced, drive_url, creator_assigned_at, editor_assigned_at, delivered_at, recorded_at, reference_url, creator_paid, editor_paid, bunny_embed_url, video_processing_status, hooks_count, video_urls, raw_video_urls, editor_guidelines, strategist_guidelines, trafficker_guidelines, designer_guidelines, admin_guidelines, sphere_phase, organization_id)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, title, description, script, video_url, thumbnail_url, status, client_id, creator_id, editor_id, creator_payment, editor_payment, is_ambassador_content, is_published, views_count, likes_count, deadline, notes, script_approved_at, script_approved_by, approved_at, approved_by, paid_at, created_at, updated_at, product_id, sales_angle, campaign_week, strategist_id, start_date, invoiced, drive_url, creator_assigned_at, editor_assigned_at, delivered_at, recorded_at, reference_url, creator_paid, editor_paid, bunny_embed_url, video_processing_status, hooks_count, video_urls, raw_video_urls, editor_guidelines, strategist_guidelines, trafficker_guidelines, designer_guidelines, admin_guidelines, sphere_phase, organization_id FROM public.content'
) AS t(
  id uuid, title text, description text, script text, video_url text, 
  thumbnail_url text, status text, client_id uuid, creator_id uuid, editor_id uuid,
  creator_payment numeric, editor_payment numeric, is_ambassador_content boolean,
  is_published boolean, views_count int, likes_count int, deadline timestamptz,
  notes text, script_approved_at timestamptz, script_approved_by uuid,
  approved_at timestamptz, approved_by uuid, paid_at timestamptz,
  created_at timestamptz, updated_at timestamptz, product_id uuid, sales_angle text,
  campaign_week text, strategist_id uuid, start_date date, invoiced boolean,
  drive_url text, creator_assigned_at timestamptz, editor_assigned_at timestamptz,
  delivered_at timestamptz, recorded_at timestamptz, reference_url text,
  creator_paid boolean, editor_paid boolean, bunny_embed_url text,
  video_processing_status text, hooks_count int, video_urls text[],
  raw_video_urls text[], editor_guidelines text, strategist_guidelines text,
  trafficker_guidelines text, designer_guidelines text, admin_guidelines text,
  sphere_phase text, organization_id uuid
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  updated_at = EXCLUDED.updated_at;

-- ============================================================
-- PASO 8: ORGANIZATION MEMBERS & ROLES
-- ============================================================
INSERT INTO organization_members (id, organization_id, user_id, role, status, joined_at, invited_by, created_at, updated_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, organization_id, user_id, role, status, joined_at, invited_by, created_at, updated_at FROM public.organization_members'
) AS t(
  id uuid, organization_id uuid, user_id uuid, role text, status text,
  joined_at timestamptz, invited_by uuid, created_at timestamptz, updated_at timestamptz
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_member_roles (id, organization_id, user_id, role, created_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, organization_id, user_id, role, created_at FROM public.organization_member_roles'
) AS t(
  id uuid, organization_id uuid, user_id uuid, role text, created_at timestamptz
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 9: UP POINTS SYSTEM
-- ============================================================
INSERT INTO up_creadores (id, user_id, content_id, organization_id, event_type, points, event_date, days_to_deliver, notes, created_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, user_id, content_id, organization_id, event_type, points, event_date, days_to_deliver, notes, created_at FROM public.up_creadores'
) AS t(
  id uuid, user_id uuid, content_id uuid, organization_id uuid, event_type text,
  points int, event_date date, days_to_deliver int, notes text, created_at timestamptz
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO up_creadores_totals (id, user_id, organization_id, total_points, total_deliveries, on_time_deliveries, late_deliveries, total_issues, clean_approvals, reassignments, current_level, updated_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, user_id, organization_id, total_points, total_deliveries, on_time_deliveries, late_deliveries, total_issues, clean_approvals, reassignments, current_level, updated_at FROM public.up_creadores_totals'
) AS t(
  id uuid, user_id uuid, organization_id uuid, total_points int, total_deliveries int,
  on_time_deliveries int, late_deliveries int, total_issues int, clean_approvals int,
  reassignments int, current_level text, updated_at timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  total_points = EXCLUDED.total_points,
  updated_at = EXCLUDED.updated_at;

INSERT INTO up_editores (id, user_id, content_id, organization_id, event_type, points, event_date, days_to_deliver, notes, created_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, user_id, content_id, organization_id, event_type, points, event_date, days_to_deliver, notes, created_at FROM public.up_editores'
) AS t(
  id uuid, user_id uuid, content_id uuid, organization_id uuid, event_type text,
  points int, event_date date, days_to_deliver int, notes text, created_at timestamptz
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO up_editores_totals (id, user_id, organization_id, total_points, total_deliveries, on_time_deliveries, late_deliveries, total_issues, clean_approvals, reassignments, current_level, updated_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, user_id, organization_id, total_points, total_deliveries, on_time_deliveries, late_deliveries, total_issues, clean_approvals, reassignments, current_level, updated_at FROM public.up_editores_totals'
) AS t(
  id uuid, user_id uuid, organization_id uuid, total_points int, total_deliveries int,
  on_time_deliveries int, late_deliveries int, total_issues int, clean_approvals int,
  reassignments int, current_level text, updated_at timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  total_points = EXCLUDED.total_points,
  updated_at = EXCLUDED.updated_at;

-- ============================================================
-- PASO 10: CLIENT PACKAGES
-- ============================================================
INSERT INTO client_packages (id, client_id, name, description, total_value, content_quantity, hooks_per_video, creators_count, products_count, product_ids, payment_status, paid_amount, paid_at, notes, is_active, created_at, updated_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, client_id, name, description, total_value, content_quantity, hooks_per_video, creators_count, products_count, product_ids, payment_status, paid_amount, paid_at, notes, is_active, created_at, updated_at FROM public.client_packages'
) AS t(
  id uuid, client_id uuid, name text, description text, total_value numeric,
  content_quantity int, hooks_per_video int, creators_count int, products_count int,
  product_ids uuid[], payment_status text, paid_amount numeric, paid_at timestamptz,
  notes text, is_active boolean, created_at timestamptz, updated_at timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = EXCLUDED.updated_at;

-- ============================================================
-- PASO 11: AI CONFIGURATION
-- ============================================================
INSERT INTO ai_assistant_config (id, organization_id, provider, model, assistant_name, system_prompt, tone, is_enabled, created_at, updated_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, organization_id, provider, model, assistant_name, system_prompt, tone, is_enabled, created_at, updated_at FROM public.ai_assistant_config'
) AS t(
  id uuid, organization_id uuid, provider text, model text, assistant_name text,
  system_prompt text, tone text, is_enabled boolean, created_at timestamptz, updated_at timestamptz
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 12: CHAT SYSTEM
-- ============================================================
INSERT INTO chat_conversations (id, organization_id, content_id, chat_type, is_group, name, created_by, created_at, updated_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, organization_id, content_id, chat_type, is_group, name, created_by, created_at, updated_at FROM public.chat_conversations'
) AS t(
  id uuid, organization_id uuid, content_id uuid, chat_type text, is_group boolean,
  name text, created_by uuid, created_at timestamptz, updated_at timestamptz
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_messages (id, conversation_id, sender_id, content, attachment_url, attachment_type, attachment_name, attachment_size, delivered_at, read_at, created_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, conversation_id, sender_id, content, attachment_url, attachment_type, attachment_name, attachment_size, delivered_at, read_at, created_at FROM public.chat_messages'
) AS t(
  id uuid, conversation_id uuid, sender_id uuid, content text, attachment_url text,
  attachment_type text, attachment_name text, attachment_size bigint,
  delivered_at timestamptz, read_at timestamptz, created_at timestamptz
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 13: NOTIFICATIONS
-- ============================================================
INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, user_id, title, message, type, link, is_read, created_at FROM public.notifications'
) AS t(
  id uuid, user_id uuid, title text, message text, type text, link text,
  is_read boolean, created_at timestamptz
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 14: PAYMENTS
-- ============================================================
INSERT INTO payments (id, user_id, content_id, amount, payment_type, status, notes, paid_at, created_at)
SELECT * FROM dblink(
  'dbname=postgres host=db.hfooshsteglylhvrpuka.supabase.co user=postgres password=YOUR_PASSWORD',
  'SELECT id, user_id, content_id, amount, payment_type, status, notes, paid_at, created_at FROM public.payments'
) AS t(
  id uuid, user_id uuid, content_id uuid, amount numeric, payment_type text,
  status text, notes text, paid_at timestamptz, created_at timestamptz
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 15: REACTIVAR FOREIGN KEYS
-- ============================================================
SET session_replication_role = 'origin';

-- ============================================================
-- PASO 16: ACTUALIZAR URLS DE STORAGE
-- ============================================================
-- Ejecutar después de migrar los archivos de storage

UPDATE profiles 
SET avatar_url = REPLACE(avatar_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE avatar_url LIKE '%hfooshsteglylhvrpuka%';

UPDATE organizations 
SET logo_url = REPLACE(logo_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE logo_url LIKE '%hfooshsteglylhvrpuka%';

UPDATE clients 
SET logo_url = REPLACE(logo_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE logo_url LIKE '%hfooshsteglylhvrpuka%';

UPDATE content 
SET thumbnail_url = REPLACE(thumbnail_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE thumbnail_url LIKE '%hfooshsteglylhvrpuka%';

UPDATE content 
SET video_url = REPLACE(video_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE video_url LIKE '%hfooshsteglylhvrpuka%';

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT 'organizations' as tabla, COUNT(*) as registros FROM organizations
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'content', COUNT(*) FROM content
UNION ALL
SELECT 'organization_members', COUNT(*) FROM organization_members
UNION ALL
SELECT 'organization_member_roles', COUNT(*) FROM organization_member_roles
UNION ALL
SELECT 'up_creadores_totals', COUNT(*) FROM up_creadores_totals
UNION ALL
SELECT 'up_editores_totals', COUNT(*) FROM up_editores_totals
UNION ALL
SELECT 'client_packages', COUNT(*) FROM client_packages
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM chat_messages
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'payments', COUNT(*) FROM payments;
