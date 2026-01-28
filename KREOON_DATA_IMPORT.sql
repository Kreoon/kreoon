-- ============================================================
-- SCRIPT DE IMPORTACIÓN DE DATOS PARA KREOON
-- Proyecto destino: wjkbqcrxwsmvtxmqgiqc (Kreoon)
-- Generado: 2026-01-28
-- ============================================================
-- INSTRUCCIONES:
-- 1. Ve al SQL Editor en tu dashboard de Supabase Kreoon
-- 2. Copia y pega este script completo
-- 3. Ejecuta el script
-- ============================================================

-- PASO 1: Desactivar temporalmente las restricciones de FK
SET session_replication_role = 'replica';

-- ============================================================
-- ORGANIZATIONS (3 registros)
-- ============================================================

INSERT INTO organizations (id, name, slug, logo_url, description, default_role, is_registration_open, registration_code, primary_color, organization_type, timezone, admin_email, admin_name, admin_phone, city, country, address, billing_email, website, instagram, selected_plan, subscription_status, trial_active, trial_started_at, trial_end_date, settings, registration_page_config, registration_require_invite, created_at, updated_at) VALUES ('c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'UGC Colombia', 'ugc-colombia', 'https://hfooshsteglylhvrpuka.supabase.co/storage/v1/object/public/organizations/c8ae6c6d-a15d-46d9-b69e-465f7371595e/logo.jpg?t=1767137076001', '', 'creator', true, '7C34DFD9', '#ffd500', 'agency', 'America/Bogota', 'admin@ugccolombia.com', 'Diana Milena Torres Lopez', '+573113842399', 'Medellin', 'Colombia', 'Carrera 54 #1A - 54 Int 305', 'kairosgp.sas@gmail.com', 'https://ugccolombia.co', 'agenciaugccolombia', 'starter', 'trial', true, '2025-12-29 04:12:26.882413+00', '2026-01-28 04:12:26.882413+00', '{"editor_randomizer_enabled": true}'::jsonb, '{"banner_url": "https://hfooshsteglylhvrpuka.supabase.co/storage/v1/object/public/organizations/c8ae6c6d-a15d-46d9-b69e-465f7371595e/registration-banner.jpg", "show_phone": false, "custom_fields": [], "welcome_title": "Bienvenidos a UGC Colombia", "welcome_message": "Somos la Agencia #1 de contenido estratégico en Colombia", "show_description": true, "show_role_selector": false}'::jsonb, true, '2025-12-26 23:01:49.524679+00', '2025-12-30 23:31:48.212232+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (id, name, slug, logo_url, description, default_role, is_registration_open, registration_code, primary_color, organization_type, timezone, admin_email, admin_name, admin_phone, city, country, address, billing_email, website, instagram, selected_plan, subscription_status, trial_active, trial_started_at, trial_end_date, settings, registration_page_config, registration_require_invite, created_at, updated_at) VALUES ('479b48d9-ef42-4982-8d64-a4040ad3104d', 'Grupo effi', 'grupo-effi-mk1ovtpu', NULL, NULL, 'editor', true, '2DF093A2', '#002aff', 'company', 'America/Bogota', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'starter', 'trial', true, '2026-01-05 21:45:19.404533+00', '2026-02-04 21:45:19.404533+00', '{}'::jsonb, '{"show_phone": false, "custom_fields": [], "welcome_message": null, "show_role_selector": false}'::jsonb, true, '2026-01-05 21:45:19.404533+00', '2026-01-05 21:54:05.474544+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (id, name, slug, logo_url, description, default_role, is_registration_open, registration_code, primary_color, organization_type, timezone, admin_email, admin_name, admin_phone, city, country, address, billing_email, website, instagram, selected_plan, subscription_status, trial_active, trial_started_at, trial_end_date, settings, registration_page_config, registration_require_invite, created_at, updated_at) VALUES ('cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'Prueba', 'prueba-mjnl99gg', NULL, NULL, 'creator', true, '065120E6', '#8B5CF6', 'agency', 'America/Bogota', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'starter', 'trial', true, '2025-12-29 04:12:26.882413+00', '2026-01-28 04:12:26.882413+00', '{}'::jsonb, '{"show_phone": false, "custom_fields": [], "welcome_message": null, "show_description": false, "show_role_selector": false}'::jsonb, true, '2025-12-27 00:55:00.97974+00', '2025-12-30 01:09:09.71345+00') ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PROFILES (Usuarios)
-- NOTA: Los usuarios auth.users necesitan migrarse por separado
-- ============================================================

INSERT INTO profiles (id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at) VALUES ('15ed42a0-62fc-401b-8db0-f7464aa863ef', 'stefa.mdigital@gmail.com', 'Stefany aguirre diaz', 'stefyugc', 'https://hfooshsteglylhvrpuka.supabase.co/storage/v1/object/public/avatars/15ed42a0-62fc-401b-8db0-f7464aa863ef/15ed42a0-62fc-401b-8db0-f7464aa863ef-1766525419901.jpeg', '3057705844', '', true, true, NULL, '@stefy.ugc', 'Stefys06', '', 'Itagui', 'Carrera54a#34a66 piso2', 'Cc', '1017201277', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'active', '2025-12-23 21:04:19.323514+00', '2026-01-20 23:17:49.120521+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at) VALUES ('02f8f3bb-6006-4510-b952-45c7baa80547', 'camilahoyosr@hotmail.com', 'Camila Hoyos', 'camilahoyos', NULL, NULL, NULL, false, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'active', '2026-01-19 13:42:36.922042+00', '2026-01-19 13:43:37.438231+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at) VALUES ('efb01b27-1100-488d-aa59-34aee64767e7', 'ktevoluciona@gmail.com', 'katherine Acevedo Sánchez', 'katherineacevedosnch', 'https://hfooshsteglylhvrpuka.supabase.co/storage/v1/object/public/avatars/efb01b27-1100-488d-aa59-34aee64767e7/efb01b27-1100-488d-aa59-34aee64767e7-1766854487993.jpg', '3207066200', 'Aquí encuentras a Ktevoluciona: una mujer en constante cambio, aprendizaje y crecimiento. Alguien que no se queda quieta, que transforma sus procesos, sus retos y sus talentos en contenido con propósito', true, true, '', 'https://www.instagram.com/ktevoluciona?igsh=c3JidXg1OG45ZG56', 'https://www.tiktok.com/@ktacevedos?_r=1&_t=ZS-92wEEHk9u54', '', '', '', '', '', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'active', '2025-12-23 16:07:14.534101+00', '2026-01-15 22:51:47.633687+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at) VALUES ('721005b1-f2d3-428c-9bb7-b161cc865dba', 'dancy.abetancur@gmail.com', 'Dancy Betancur Gómez', 'dancybetancurgmez', NULL, NULL, NULL, false, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'active', '2026-01-06 17:36:46.260677+00', '2026-01-06 17:36:48.121835+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at) VALUES ('8569be04-9e86-49d8-9714-3d81423e836e', 'alexander7818@gmail.com', 'Alexander', 'alexander', 'https://hfooshsteglylhvrpuka.supabase.co/storage/v1/object/public/avatars/8569be04-9e86-49d8-9714-3d81423e836e/avatar_1767039153672.png', '', '', true, true, '', '', '', '', 'Medellín', '', '', '', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'active', '2025-12-22 23:02:28.465656+00', '2026-01-07 21:54:54.408507+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at) VALUES ('9ecba947-f950-4a71-be13-376853b3cf75', 'andreatabares742@gmail.com', 'Yuli Andrea tabares', 'andreatabares', 'https://hfooshsteglylhvrpuka.supabase.co/storage/v1/object/public/avatars/9ecba947-f950-4a71-be13-376853b3cf75/avatar_1767903245200.webp', '', '', false, true, '', 'Andreatabaresfotos', '', '', 'Marinilla', '', '', '', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'active', '2026-01-08 20:10:51.979173+00', '2026-01-08 20:26:46.984859+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at) VALUES ('425c20c8-834c-47d2-93a0-b127f8bfca8e', 'amoncada@smartbeemo.com', 'Ana Gabriela Moncada', 'anagabrielamoncada', NULL, NULL, NULL, false, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'active', '2025-12-31 13:59:23.800253+00', '2025-12-31 14:57:31.293129+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at) VALUES ('c3d58e31-4d36-4549-8493-78c334991c2a', 'valmarugc@gmail.com', 'Valeria Martínez Muñoz ', 'valmar_mz', '', '3175028696', '', false, true, 'https://www.canva.com/design/DAGoYH46iH4/xnNVexSIQKwR_ojh6nI2Hw/edit?utm_content=DAGoYH46iH4&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton', 'valmar_mz', 'valmar_mz', '', 'Medellin', 'calle 50 a # 98 - 30', 'CC', '1143984764', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'active', '2025-12-27 21:55:50.890087+00', '2026-01-09 17:02:59.515755+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at) VALUES ('9fc916cc-cfce-4189-a274-c041eb05fb38', 'jorgeenriquegarnicacoach@gmail.com', 'Jorge enrique Garnica C', 'jorgeenriquegarnicac', 'https://hfooshsteglylhvrpuka.supabase.co/storage/v1/object/public/avatars/9fc916cc-cfce-4189-a274-c041eb05fb38/avatar_1767739964070.jpg', '', '', true, true, '', '', '', '', 'Medellin', '', '', '', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'active', '2025-12-29 20:27:05.161671+00', '2026-01-06 22:55:33.15241+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at) VALUES ('d533bf9b-e7b7-48c7-be84-ef125688bde8', 'egiraldo602@gmail.com', 'Esteban Giraldo', 'estebangiraldoalzate', '', '', '', false, true, '', '', '', '', '', '', '', '', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'active', '2025-12-23 18:46:01.122094+00', '2026-01-23 18:09:24.076875+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at) VALUES ('dead16de-fe19-410c-a684-92584b7510c1', 'juanita.osocar@gmail.com', 'Juanita osorio carmona', 'juanitaosoriocarmona', NULL, NULL, NULL, false, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'active', '2025-12-23 19:25:55.880693+00', '2025-12-29 23:56:48.366555+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at) VALUES ('06aa55b0-61ea-41f0-9708-7a3d322b6795', 'jacsolucionesgraficas@gmail.com', 'Alexander Cast', 'alexemprendee', 'https://hfooshsteglylhvrpuka.supabase.co/storage/v1/object/public/avatars/06aa55b0-61ea-41f0-9708-7a3d322b6795/06aa55b0-61ea-41f0-9708-7a3d322b6795-1766500312865.jpg', '+573132947776', '', true, true, '', 'alexemprendee', '', '', 'Medellín', 'Calle 1B #56-33', 'CC', '98764722', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'active', '2025-12-20 07:50:11.060565+00', '2026-01-16 22:01:24.227421+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, username, avatar_url, phone, bio, is_ambassador, is_public, portfolio_url, instagram, tiktok, facebook, city, address, document_type, document_number, current_organization_id, organization_status, created_at, updated_at) VALUES ('2f848aa7-56ae-4b51-982d-ff5e8d45637b', 'carolinaov24@hotmail.com', 'Carolina Osorio', 'carolinaosorio', '', '3194249554', 'UGC Creator colombiana especializada en belleza, skincare y bienestar. Creo contenido auténtico y visual que conecta marcas con audiencias reales. Experiencia frente a cámara, storytelling claro y enfocado en generar confianza, engagement y ventas.', true, true, '', '@caroosoriovillada', '@caroosoriospa', '', 'Medellin', 'Calle 90 69 36', 'Cc ', '1214722085', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'active', '2025-12-20 23:37:53.325649+00', '2026-01-09 05:00:05.462616+00') ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CLIENTS (17 registros)
-- ============================================================

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('481b60d2-f805-49b4-b6b9-96d5a60df3c2', 'Salud ProLab', 'saludprolab@gmail.com', NULL, NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', false, true, NULL, '2025-12-26 14:04:24.21165+00', '2026-01-02 21:40:27.648266+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('550b27c8-ec13-490c-89a0-6d32c3b5d731', 'Prueba', NULL, NULL, NULL, NULL, NULL, NULL, 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', true, false, NULL, '2025-12-27 18:15:06.781636+00', '2025-12-27 18:15:06.781636+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('226d5e7b-acae-4e85-a713-112ead7bfbe3', 'Mis Organizadores ', 'admon@misorganizadores.com', '+57 315 5411952', NULL, '', NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', false, false, NULL, '2025-12-24 18:01:05.718298+00', '2026-01-13 16:43:58.225002+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('2651cbc6-c9c9-47ae-a3e7-e3440b407145', 'Beemo', 'Jperez@smartbeemo.com', '+57 300 7364003', NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', false, false, NULL, '2025-12-31 13:47:42.034214+00', '2025-12-31 13:47:42.034214+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('d6091100-8b43-4368-9192-d1bc829b77e4', 'Fexe / BlinkSpa', 'andres.salgado@fexe.co', '+57 3193166732', NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', false, false, NULL, '2025-12-31 15:02:30.503046+00', '2025-12-31 15:02:30.503046+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('27681942-2d79-4caa-b3e2-548f7bf81aec', 'Grupo effi', NULL, NULL, NULL, NULL, NULL, NULL, '479b48d9-ef42-4982-8d64-a4040ad3104d', true, false, NULL, '2026-01-05 21:45:19.404533+00', '2026-01-05 21:45:19.404533+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('035b6a81-cf76-4fab-9f73-40cb0172196d', 'Importaciones Tokio ', 'shop1tokio@gmail.com', '+57 322 3910857', NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', false, false, NULL, '2026-01-05 21:29:14.717837+00', '2026-01-15 20:42:11.574058+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('2dd66c1e-33fe-465f-9f53-e7a6a8f85a4a', 'David Marin ', 'davidmarinlopez07@gmail.com', '3045312900', NULL, 'Estrategias de publicidad', NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', false, false, NULL, '2026-01-17 03:12:24.123716+00', '2026-01-17 03:12:24.123716+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('4295d881-1c1a-4a2e-abe3-5a9773b7c858', 'Naraa', 'jose@ferjos.com', '3105178656', NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', false, false, NULL, '2026-01-17 14:38:00.836599+00', '2026-01-17 14:38:00.836599+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('c4d2e5dd-b79a-4893-a2c5-515183881b82', 'Big Agency Social', 'bigagencysocial@gmail.com', '3023739160', NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', false, false, NULL, '2025-12-29 15:00:31.296871+00', '2026-01-19 22:41:47.444577+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('da3ba341-73c2-46f9-97d0-8e11af7cd901', 'Esto es una pruena', NULL, NULL, NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', false, false, NULL, '2026-01-26 20:45:40.845997+00', '2026-01-26 20:45:40.845997+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('898406b0-c585-4220-9a90-93770d3826bb', 'Juegos Parchis', 'ale312109@gmail.com', NULL, NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', false, false, NULL, '2025-12-27 07:18:07.180321+00', '2026-01-06 04:11:08.213785+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('4ec517da-a013-49bf-af60-371109e83656', 'SaleADS.ia', NULL, NULL, NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', false, false, NULL, '2026-01-06 20:57:39.962474+00', '2026-01-06 20:57:39.962474+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('3d4de2e3-29c5-4f8f-b61e-fa1a07e5c33c', 'Laboratorio Soluna ', 'gerencia@laboratoriosoluna.co', '311 3400803', NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', false, false, NULL, '2026-01-07 20:08:16.695971+00', '2026-01-07 20:08:16.695971+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('3b25879c-6655-47c8-ae81-41c01744e1a3', 'Unlocked Academy', 'juanbotero@naicipa.com', '+1 (305) 833-7172', NULL, 'La ruta estructurada y el acompañamiento continuo para transformar la improvisación en un negocio digital con ventas consistentes y escalables, eliminando el riesgo de la prueba y error.', NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', false, false, NULL, '2025-12-21 17:27:46.626516+00', '2026-01-08 15:27:33.110306+00') ON CONFLICT (id) DO NOTHING;

INSERT INTO clients (id, name, contact_email, contact_phone, logo_url, notes, user_id, created_by, organization_id, is_internal_brand, is_vip, category, created_at, updated_at) VALUES ('675e7db4-1212-481a-b348-9b7aa8178cbe', 'UGC Colombia', 'mile_160711@hotmail.com', '3126944694', NULL, NULL, NULL, NULL, 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', true, true, NULL, '2025-12-27 11:32:30.739341+00', '2026-01-10 16:30:52.58231+00') ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO FINAL: Reactivar restricciones de FK
-- ============================================================
SET session_replication_role = 'origin';

-- ============================================================
-- ACTUALIZAR URLS DE STORAGE (después de copiar archivos)
-- ============================================================
-- Ejecuta esto DESPUÉS de copiar los archivos de storage

UPDATE profiles 
SET avatar_url = REPLACE(avatar_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE avatar_url LIKE '%hfooshsteglylhvrpuka%';

UPDATE organizations 
SET logo_url = REPLACE(logo_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE logo_url LIKE '%hfooshsteglylhvrpuka%';

UPDATE clients 
SET logo_url = REPLACE(logo_url, 'hfooshsteglylhvrpuka', 'wjkbqcrxwsmvtxmqgiqc')
WHERE logo_url LIKE '%hfooshsteglylhvrpuka%';

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT 'organizations' as tabla, COUNT(*) as registros FROM organizations
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'clients', COUNT(*) FROM clients;
