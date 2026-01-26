-- ============================================================
-- KREOON - EXPORTACIÓN COMPLETA DE DATOS
-- Generado: 2026-01-26
-- Total: 172 tablas, datos principales exportados
-- ============================================================

-- IMPORTANTE: Ejecutar ANTES de insertar datos
SET session_replication_role = 'replica';

-- ============================================================
-- PASO 1: ORGANIZATIONS (3 registros)
-- ============================================================
INSERT INTO organizations (id, name, slug, logo_url, description, default_role, is_registration_open, registration_code, primary_color, organization_type, timezone, admin_email, admin_name, admin_phone, city, country, address, billing_email, website, instagram, selected_plan, subscription_status, trial_active, trial_started_at, trial_end_date, settings, registration_page_config, registration_require_invite, allow_public_network, is_blocked, created_at, updated_at) VALUES
('c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'UGC Colombia', 'ugc-colombia', 'https://hfooshsteglylhvrpuka.supabase.co/storage/v1/object/public/organizations/c8ae6c6d-a15d-46d9-b69e-465f7371595e/logo.jpg?t=1767137076001', '', 'creator', true, '7C34DFD9', '#ffd500', 'agency', 'America/Bogota', 'admin@ugccolombia.com', 'Diana Milena Torres Lopez', '+573113842399', 'Medellin', 'Colombia', 'Carrera 54 #1A - 54 Int 305', 'kairosgp.sas@gmail.com', 'https://ugccolombia.co', 'agenciaugccolombia', 'starter', 'trial', true, '2025-12-29 04:12:26.882413+00', '2026-01-28 04:12:26.882413+00', '{"editor_randomizer_enabled":true}', '{"banner_url":"https://hfooshsteglylhvrpuka.supabase.co/storage/v1/object/public/organizations/c8ae6c6d-a15d-46d9-b69e-465f7371595e/registration-banner.jpg","custom_fields":[],"show_description":true,"show_phone":false,"show_role_selector":false,"welcome_message":"Somos la Agencia #1 de contenido estratégico en Colombia","welcome_title":"Bienvenidos a UGC Colombia"}', true, false, false, '2025-12-26 23:01:49.524679+00', '2025-12-30 23:31:48.212232+00'),
('479b48d9-ef42-4982-8d64-a4040ad3104d', 'Grupo effi', 'grupo-effi-mk1ovtpu', NULL, NULL, 'editor', true, '2DF093A2', '#002aff', 'company', 'America/Bogota', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'starter', 'trial', true, '2026-01-05 21:45:19.404533+00', '2026-02-04 21:45:19.404533+00', '{}', '{"custom_fields":[],"show_phone":false,"show_role_selector":false}', true, false, false, '2026-01-05 21:45:19.404533+00', '2026-01-05 21:54:05.474544+00'),
('cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'Prueba', 'prueba-mjnl99gg', NULL, NULL, 'creator', true, '065120E6', '#8B5CF6', 'agency', 'America/Bogota', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'starter', 'trial', true, '2025-12-29 04:12:26.882413+00', '2026-01-28 04:12:26.882413+00', '{}', '{"custom_fields":[],"show_description":false,"show_phone":false,"show_role_selector":false}', true, false, false, '2025-12-27 00:55:00.97974+00', '2025-12-30 01:09:09.71345+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 2: APP_SETTINGS (configuración global)
-- ============================================================
INSERT INTO app_settings (id, key, value, description, updated_at) VALUES
('ffaacfb5-dccb-46e4-a33f-f933169f06df', 'whatsapp_access_request', '573113842399', 'Número de WhatsApp para solicitudes de acceso', '2025-12-22 23:54:16.023124+00'),
('a2a09ee1-5681-4fc2-a1a1-76aef3410917', 'og_image_url', '', 'Imagen para redes sociales', '2025-12-29 15:47:55.022+00'),
('865a3821-141e-4565-8b64-fae55fe837b1', 'primary_color', '#7700b8', 'Color primario de la marca', '2025-12-29 15:47:55.255+00'),
('8533375c-4359-471f-bbac-7ceeae8a0064', 'theme_color', '#7700b8', 'Color del tema PWA', '2025-12-29 15:47:55.471+00'),
('c70e4e70-0286-4467-bc73-c5c0d8afcb26', 'favicon_url', '/favicon.png', 'URL del favicon', '2025-12-29 16:08:06.24145+00'),
('fd92ed2a-269a-436d-b74c-626afbd1af10', 'pwa_icon_192', '/pwa-192x192.png', 'Ícono PWA 192x192', '2025-12-29 16:08:06.24145+00'),
('e152f89b-8e44-4475-8f32-c47a8e7323d9', 'pwa_icon_512', '/pwa-512x512.png', 'Ícono PWA 512x512', '2025-12-29 16:08:06.24145+00'),
('38b406c8-fbdd-4e6b-a987-e5db75983d6a', 'live_streaming_enabled', 'false', 'Feature flag global para habilitar Live Streaming para organizaciones. Solo editable por Root.', '2025-12-30 02:27:04.035+00'),
('a77a6772-6c61-4039-a335-cb8e7e0c7e12', 'ghl_webhook_url', 'https://services.leadconnectorhq.com/hooks/aicW0x5XOKYI7QWUpVnu/webhook-trigger/c5eb7b33-1a3a-4527-93a8-c631f4e9f341', 'Funnel ROI (GHL) - Sincronización', '2025-12-23 20:22:02.057+00'),
('fd68b2b7-398f-4f82-9962-b72eeaa064c9', 'n8n_script_generator_prod_url', 'https://n8n.infinygroup.com/webhook/Creartorstudioguionizadorproyectos', 'n8n - Generador de Scripts', '2025-12-23 20:22:02.339+00'),
('e9aec127-eb46-42d8-843e-33e1d18f9011', 'n8n_script_generator_mode', 'production', 'Modo de webhook: n8n_script_generator', '2025-12-23 20:22:02.606+00'),
('bdf396f0-683c-47b2-ac93-9af5225a6cab', 'n8n_drive_upload_mode', 'test', 'Modo de webhook: n8n_drive_upload', '2025-12-23 20:22:02.89+00'),
('5a585c8d-0460-40cb-b62e-6591f87b0b48', 'bunny_callback_mode', 'test', 'Modo de webhook: bunny_callback', '2025-12-23 20:22:03.159+00'),
('c0a45c88-10e5-41d3-b2b8-b9bc13926ae2', 'ghl_sync_mode', 'production', 'Modo de webhook: ghl_sync', '2025-12-23 20:22:03.427+00'),
('a34692e0-3a90-4691-95ce-822035f49f43', 'billing_enabled', 'false', 'Controla si el sistema de cobros está activo. En false, todas las organizaciones tienen acceso completo sin restricciones de trial.', '2025-12-29 04:12:26.882413+00'),
('789052f7-70ad-45ca-85ef-bfcd9a23f9a6', 'trial_warning_days', '7,3', 'Días antes del fin del trial para mostrar advertencias (separados por coma)', '2025-12-29 04:12:26.882413+00'),
('ce19c983-cfff-4e4f-85f7-4e937eb565ba', 'kreoon_ia_webhook_trafficker', 'https://n8n.infinygroup.com/webhook-test/kreoon_ia_webhook_script', 'Webhook n8n para generar pautas del trafficker en KREOON IA', '2026-01-21 15:03:31.929+00'),
('3347ded9-b069-4cff-a821-2a7b88f00707', 'kreoon_ia_webhook_strategist', 'https://n8n.infinygroup.com/webhook-test/kreoon_ia_webhook_script', 'Webhook n8n para generar pautas del estratega en KREOON IA', '2026-01-21 15:03:41.462+00'),
('b8e00026-5327-4f36-9519-51521763771a', 'platform_name', 'KREOON', 'Nombre de la plataforma', '2025-12-29 15:47:53.641+00'),
('fd4aa9c1-e9d0-4ce6-87c7-9ce8cc225988', 'logo_url', '', 'URL del logo principal (claro)', '2025-12-29 15:47:53.926+00'),
('8f0dd161-09b8-48a4-9257-7f0788989f03', 'logo_dark_url', '', 'URL del logo para fondos oscuros', '2025-12-29 15:47:54.149+00'),
('5c5de05d-070a-4287-92a5-a0cb0e9dd153', 'kreoon_ia_webhook_script', 'https://n8n.infinygroup.com/webhook-test/kreoon_ia_webhook_script', 'Webhook n8n para generar el guión del creador en KREOON IA', '2026-01-21 15:03:43.606+00'),
('2bb631d0-d6a5-45a3-b36f-a0211d29bc13', 'kreoon_ia_webhook_editor', 'https://n8n.infinygroup.com/webhook-test/kreoon_ia_webhook_script', 'Webhook n8n para generar pautas del editor en KREOON IA', '2026-01-21 15:03:45.904+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 3: CLIENTS (15 registros)
-- ============================================================
INSERT INTO clients (id, name, organization_id, contact_email, contact_phone, is_vip, is_public, is_internal_brand, bio, city, country, strategy_service_enabled, traffic_service_enabled, created_at, updated_at) VALUES
('481b60d2-f805-49b4-b6b9-96d5a60df3c2', 'Salud ProLab', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'saludprolab@gmail.com', NULL, true, true, false, NULL, NULL, NULL, false, false, '2025-12-26 14:04:24.21165+00', '2026-01-02 21:40:27.648266+00'),
('550b27c8-ec13-490c-89a0-6d32c3b5d731', 'Prueba', 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', NULL, NULL, false, false, true, 'Marca interna de Prueba para contenido de embajadores', NULL, NULL, false, false, '2025-12-27 18:15:06.781636+00', '2025-12-27 18:15:06.781636+00'),
('226d5e7b-acae-4e85-a713-112ead7bfbe3', 'Mis Organizadores', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'admon@misorganizadores.com', '+57 315 5411952', false, true, false, NULL, NULL, NULL, false, false, '2025-12-24 18:01:05.718298+00', '2026-01-13 16:43:58.225002+00'),
('2651cbc6-c9c9-47ae-a3e7-e3440b407145', 'Beemo', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'Jperez@smartbeemo.com', '+57 300 7364003', false, true, false, NULL, NULL, NULL, false, false, '2025-12-31 13:47:42.034214+00', '2025-12-31 13:47:42.034214+00'),
('d6091100-8b43-4368-9192-d1bc829b77e4', 'Fexe / BlinkSpa', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'andres.salgado@fexe.co', '+57 3193166732', false, true, false, NULL, NULL, NULL, false, false, '2025-12-31 15:02:30.503046+00', '2025-12-31 15:02:30.503046+00'),
('27681942-2d79-4caa-b3e2-548f7bf81aec', 'Grupo effi', '479b48d9-ef42-4982-8d64-a4040ad3104d', NULL, NULL, false, false, true, 'Marca interna de Grupo effi para contenido de embajadores', NULL, NULL, false, false, '2026-01-05 21:45:19.404533+00', '2026-01-05 21:45:19.404533+00'),
('035b6a81-cf76-4fab-9f73-40cb0172196d', 'Tokio Shop', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'shop1tokio@gmail.com', '+57 322 3910857', false, true, false, NULL, 'Bogotá', 'CO', false, false, '2026-01-05 21:29:14.717837+00', '2026-01-05 21:29:14.717837+00'),
('3b25879c-6655-47c8-ae81-41c01744e1a3', 'UGC Colombia (Interna)', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'contacto@ugccolombia.co', NULL, false, false, true, 'Marca interna de UGC Colombia para contenido de embajadores', NULL, NULL, false, false, '2025-12-21 13:53:53.019852+00', '2025-12-21 13:53:53.019852+00'),
('675e7db4-1212-481a-b348-9b7aa8178cbe', 'Growth Starter', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'growthstarter@gmail.com', NULL, false, true, false, NULL, NULL, NULL, false, false, '2025-12-22 20:08:47.019852+00', '2025-12-22 20:08:47.019852+00'),
('898406b0-c585-4220-9a90-93770d3826bb', 'VitaSkin', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'info@vitaskin.co', NULL, false, true, false, NULL, NULL, NULL, false, false, '2025-12-29 15:01:03.036124+00', '2025-12-29 15:01:03.036124+00'),
('4ec517da-a013-49bf-af60-371109e83656', 'ProCollab', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'info@procollab.co', NULL, false, true, false, NULL, NULL, NULL, false, false, '2026-01-06 20:58:31.742611+00', '2026-01-06 20:58:31.742611+00'),
('3d4de2e3-29c5-4f8f-b61e-fa1a07e5c33c', 'NaturLife', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'contacto@naturlife.co', NULL, false, true, false, NULL, NULL, NULL, false, false, '2026-01-07 20:09:33.601914+00', '2026-01-07 20:09:33.601914+00'),
('2dd66c1e-33fe-465f-9f53-e7a6a8f85a4a', 'EcoVita', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'info@ecovita.co', NULL, false, true, false, NULL, NULL, NULL, false, false, '2026-01-17 03:13:50.737101+00', '2026-01-17 03:13:50.737101+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 4: USER_ROLES (26 registros)
-- ============================================================
INSERT INTO user_roles (id, user_id, role, created_at) VALUES
('2431f3a7-84e8-4681-8301-db9397a496c0', 'efb01b27-1100-488d-aa59-34aee64767e7', 'creator', '2025-12-29 20:57:52.901255+00'),
('d9d720f3-9272-4705-bf77-e2c0fb28567d', '8569be04-9e86-49d8-9714-3d81423e836e', 'admin', '2025-12-29 20:57:52.901255+00'),
('26eed126-7e17-42ba-8eba-408116f034d9', '2f848aa7-56ae-4b51-982d-ff5e8d45637b', 'creator', '2025-12-29 20:57:52.901255+00'),
('6fdd5e9e-47c4-4334-bf2b-9fb1fae47f79', 'dead16de-fe19-410c-a684-92584b7510c1', 'creator', '2025-12-29 20:57:52.901255+00'),
('28453be2-3a5a-4d8c-a880-476f8aced9b9', '258047cf-198c-4112-8ab6-bed278ec9f3a', 'creator', '2025-12-29 20:57:52.901255+00'),
('8bdd0edf-c606-43e0-a699-5a6fd9bd3074', 'ed6d109a-c72d-4e3c-9f61-c8d7d5ff30a6', 'creator', '2025-12-29 20:57:52.901255+00'),
('8ff53645-70d4-4b3d-a91d-68bb36f146ce', '76d69db1-2532-4319-a55d-f07e1e91a950', 'creator', '2025-12-29 20:57:52.901255+00'),
('2908c84b-2490-4950-be2c-aaa2e7215c70', '8faa68b6-5b17-4f8e-a89b-f0a560b7b000', 'admin', '2025-12-29 20:57:52.901255+00'),
('a567784f-c2ae-4e46-bb57-fc29391c9b8b', 'd533bf9b-e7b7-48c7-be84-ef125688bde8', 'editor', '2025-12-29 20:57:52.901255+00'),
('4ed62b60-69aa-4452-a352-7862e46c097b', '4df21b6d-2a7d-4ea3-b3b9-0b26ce51df31', 'creator', '2025-12-29 20:57:52.901255+00'),
('4dff685c-2252-4697-8ceb-ffafe12afe24', 'ffed6433-76f2-48dc-926c-ec54a5088709', 'client', '2025-12-29 20:57:52.901255+00'),
('272d7684-1381-4d4f-b19d-58b8c0ba91f6', 'f3301bce-ab88-4465-82f3-b9c87b2bfa96', 'client', '2025-12-29 20:57:52.901255+00'),
('64569f9b-805b-4ee7-9679-25e55db8692d', '06aa55b0-61ea-41f0-9708-7a3d322b6795', 'admin', '2025-12-29 20:57:52.901255+00'),
('4036ccc9-2709-4848-857c-72e30efff371', 'c3d58e31-4d36-4549-8493-78c334991c2a', 'creator', '2025-12-29 20:57:52.901255+00'),
('c39524f3-140a-47e8-aa15-0356c56bf0a5', '15ed42a0-62fc-401b-8db0-f7464aa863ef', 'creator', '2025-12-29 20:57:52.901255+00'),
('a257d4fd-635d-47dc-841f-62bf507e8237', 'cf4ba26d-888e-4df4-934e-7d720f7dc8d1', 'editor', '2025-12-29 20:57:52.901255+00'),
('b1022aa8-1bba-4717-a30d-092767dade22', '5e212d1b-9ca5-4b11-b16a-be8225475cd0', 'creator', '2025-12-29 20:57:52.901255+00'),
('0d15db8b-9e7a-4985-89d1-4a721d836414', '9fc916cc-cfce-4189-a274-c041eb05fb38', 'creator', '2025-12-29 20:57:52.901255+00'),
('2a949468-4733-442d-85fe-17b7124c512a', '61bdffb0-c704-4fae-ac3b-59420242fc5a', 'creator', '2025-12-29 20:57:52.901255+00'),
('04252075-f53a-4626-b9d0-c789f7145841', '507328d1-861d-49bc-8d64-b0a6927ac296', 'creator', '2025-12-29 20:57:52.901255+00'),
('358f4efc-4a16-4c5d-b06d-96908effa04f', 'b44b5148-b3e4-452e-8b11-5e3ba59a336a', 'creator', '2025-12-29 20:57:52.901255+00'),
('f6548969-b274-442a-806c-46ea162578ba', '3b20499e-3d16-496b-bbd3-b3cc4b163fdf', 'creator', '2025-12-29 20:57:52.901255+00'),
('1738cf43-da39-44a8-874d-a72fdf1955bf', '90437623-38e8-4c43-9f9b-e2643ed75bf8', 'admin', '2026-01-08 16:56:43.583677+00'),
('c27cf78b-75dd-4818-93b4-a7e2f6b5fef5', '90437623-38e8-4c43-9f9b-e2643ed75bf8', 'strategist', '2026-01-08 16:56:43.583677+00'),
('b5318910-f0cf-4c01-a73f-e21083ba9c58', '10842b38-4a80-490d-ada3-b3fc35d91822', 'admin', '2026-01-13 15:45:08.159278+00'),
('38f1d176-0995-4bde-a3be-cfc832de63b7', '45f51c68-6c95-40c8-a5c3-4fdd792edd0d', 'admin', '2026-01-19 15:55:43.772791+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 5: ORGANIZATION_STATUSES (estados del board)
-- ============================================================
INSERT INTO organization_statuses (id, organization_id, status_key, label, color, sort_order, is_active, created_at) VALUES
-- UGC Colombia
('ee75a588-720e-4eec-ae5b-5972e64b6caf', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'draft', 'Creado', '#6b7280', 0, true, '2025-12-27 03:46:34.396774+00'),
('fb902129-8222-48cb-9d68-0eee9e4c8780', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'script_approved', 'Guión Aprobado', '#3b82f6', 1, true, '2025-12-27 03:46:34.396774+00'),
('43ff89d7-aea2-4f69-b49e-0f00fb54b215', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'assigned', 'Asignado', '#8b5cf6', 2, true, '2025-12-27 03:46:34.396774+00'),
('0397e74a-9f4b-491d-a4d3-34888094d4c3', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'recording', 'En Grabación', '#f97316', 3, true, '2025-12-27 03:46:34.396774+00'),
('d1e8f7e8-56bf-4c21-bf87-c7d752028d6f', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'recorded', 'Grabado', '#06b6d4', 4, true, '2025-12-27 03:46:34.396774+00'),
('353e579c-1b88-4c35-9b17-8674b2139b56', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'editing', 'En Edición', '#ec4899', 5, true, '2025-12-27 03:46:34.396774+00'),
('d076ad74-1341-449a-8dea-81d6c57a2778', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'delivered', 'Entregado', '#22c55e', 6, true, '2025-12-27 03:46:34.396774+00'),
('ae218305-ac7b-48f2-957b-8ccf370e47db', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'issue', 'Novedad', '#ef4444', 7, true, '2025-12-27 03:46:34.396774+00'),
('6cd8f52f-7dfd-49c3-ba8f-96a21183a05b', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'corrected', 'Corregido', '#eab308', 8, true, '2025-12-27 03:46:34.396774+00'),
('cf3eb2bd-f8cf-49d1-bce7-8969671db67f', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'approved', 'Aprobado', '#22c55e', 9, true, '2025-12-27 03:46:34.396774+00'),
-- Prueba
('2391f7b6-d081-4af5-b47f-e1a79cd7e5e7', 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'draft', 'Creado', '#6b7280', 0, true, '2025-12-27 03:46:34.396774+00'),
('e9d6aa35-e9a2-4d91-a540-6aa3bc3cf4ac', 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'script_approved', 'Guión Aprobado', '#3b82f6', 1, true, '2025-12-27 03:46:34.396774+00'),
('d78f4c65-526b-4957-a7ff-d9609466c069', 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'assigned', 'Asignado', '#8b5cf6', 2, true, '2025-12-27 03:46:34.396774+00'),
('a76539ab-8f6f-40fc-8d34-8b254e748b9a', 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'recording', 'En Grabación', '#f97316', 3, true, '2025-12-27 03:46:34.396774+00'),
('f4c7367a-749c-4394-90cb-8af6bcd112a6', 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'recorded', 'Grabado', '#06b6d4', 4, true, '2025-12-27 03:46:34.396774+00'),
('d73b4ff5-5470-4e7d-a280-363a38bfed64', 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'editing', 'En Edición', '#ec4899', 5, true, '2025-12-27 03:46:34.396774+00'),
('812a307f-8267-4ff2-91df-cbc8e13506ad', 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'delivered', 'Entregado', '#22c55e', 6, true, '2025-12-27 03:46:34.396774+00'),
('75fa1d7e-8610-4f3c-815a-9f29a851477c', 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'issue', 'Novedad', '#ef4444', 7, true, '2025-12-27 03:46:34.396774+00'),
('90342be1-6823-4648-a1e7-b3cc451092a1', 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'corrected', 'Corregido', '#eab308', 8, true, '2025-12-27 03:46:34.396774+00'),
('7b551bc5-364e-41e2-bc0d-debcb341088a', 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'approved', 'Aprobado', '#22c55e', 9, true, '2025-12-27 03:46:34.396774+00'),
-- Grupo effi
('01fead60-3983-492b-8ddc-eaf0f2e62126', '479b48d9-ef42-4982-8d64-a4040ad3104d', 'draft', 'Creado', '#6b7280', 0, true, '2026-01-05 21:45:19.404533+00'),
('9066c8ee-75a7-4cf3-9c12-e12b9018d177', '479b48d9-ef42-4982-8d64-a4040ad3104d', 'script_approved', 'Guión Aprobado', '#3b82f6', 1, true, '2026-01-05 21:45:19.404533+00'),
('d3a82ce7-76ff-4e59-a29b-ecb58c749821', '479b48d9-ef42-4982-8d64-a4040ad3104d', 'assigned', 'Asignado', '#8b5cf6', 2, true, '2026-01-05 21:45:19.404533+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 6: BOARD_SETTINGS
-- ============================================================
INSERT INTO board_settings (id, organization_id, default_view, card_size, visible_fields, visible_sections, created_at, updated_at) VALUES
('c8965117-e29a-41fe-9beb-1a482045e262', 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'kanban', 'normal', '["title","thumbnail","status","responsible","client","deadline"]', '["brief","script","thumbnail","comments","history"]', '2025-12-27 03:08:55.752455+00', '2025-12-27 03:08:55.752455+00'),
('dfcce043-0fb6-4205-8d72-cea10cd54718', '479b48d9-ef42-4982-8d64-a4040ad3104d', 'kanban', 'normal', '["title","thumbnail","status","responsible","client","deadline"]', '["brief","script","thumbnail","comments","history"]', '2026-01-05 21:45:19.404533+00', '2026-01-05 21:45:19.404533+00'),
('994e1d57-a3c7-4d42-b98b-68091c56afce', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'kanban', 'compact', '["status","responsible","client","deadline","progress","points","title","indicators"]', '["brief","script","thumbnail","comments","history"]', '2025-12-27 03:08:55.752455+00', '2026-01-19 22:26:32.293+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 7: AI_ASSISTANT_CONFIG
-- ============================================================
INSERT INTO ai_assistant_config (id, organization_id, assistant_name, is_enabled, provider, model, tone, created_at, updated_at) VALUES
('2d70a3b8-a1bb-4355-9439-cdea9e938e7a', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'Asistente', true, 'openai', 'gpt-4o', 'profesional', '2025-12-27 19:26:07.195132+00', '2025-12-27 20:22:34.047+00'),
('6aef066d-b79c-4fab-8e3f-6e2de4e3e70c', 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'Asistente', true, 'lovable', 'google/gemini-2.5-flash', 'profesional', '2025-12-27 21:17:14.184024+00', '2025-12-27 21:17:23.528+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 8: AI_PROMPT_CONFIG
-- ============================================================
INSERT INTO ai_prompt_config (id, organization_id, assistant_role, tone, personality, language, greeting, fallback_message, max_response_length, can_discuss_competitors, can_discuss_pricing, can_share_user_data, created_at, updated_at) VALUES
('14c9f7b0-be1b-4d95-af16-f2fc555abf5c', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'Eres un asistente útil de la organización.', 'formal pero cercano', 'profesional y amigable', 'español', 'Hola, ¿en qué puedo ayudarte?', 'Lo siento, no tengo información sobre eso. ¿Puedo ayudarte con algo más?', 500, false, false, false, '2025-12-27 20:17:16.781715+00', '2025-12-27 20:17:16.781715+00'),
('2635bc0c-dd44-4ace-8de2-138ccd485d08', 'cf15ca84-aa6e-496a-b86e-056f3a4232f9', 'Eres un asistente útil de la organización.', 'formal pero cercano', 'profesional y amigable', 'español', 'Hola, ¿en qué puedo ayudarte?', 'Lo siento, no tengo información sobre eso. ¿Puedo ayudarte con algo más?', 500, false, false, false, '2025-12-27 21:17:14.486457+00', '2025-12-27 21:17:14.486457+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 9: CLIENT_USERS (relaciones cliente-usuario)
-- ============================================================
INSERT INTO client_users (id, client_id, user_id, role, created_at) VALUES
('4637d7fa-e60a-4661-8c37-53971d772033', '3b25879c-6655-47c8-ae81-41c01744e1a3', 'ffed6433-76f2-48dc-926c-ec54a5088709', 'owner', '2025-12-24 17:04:25.646371+00'),
('b746025c-bcdd-43d7-b0ce-4b1b7747df13', '481b60d2-f805-49b4-b6b9-96d5a60df3c2', 'f3301bce-ab88-4465-82f3-b9c87b2bfa96', 'owner', '2025-12-26 15:46:09.955591+00'),
('0177b055-e230-4aca-ae8b-4cd26fbe6c37', '898406b0-c585-4220-9a90-93770d3826bb', '10842b38-4a80-490d-ada3-b3fc35d91822', 'owner', '2025-12-29 15:01:03.036124+00'),
('b8ed26e7-08d2-41b1-bb39-454cc3136578', '675e7db4-1212-481a-b348-9b7aa8178cbe', '45f51c68-6c95-40c8-a5c3-4fdd792edd0d', 'owner', '2025-12-29 15:12:27.714897+00'),
('3b051458-691d-433b-b0d4-dedd76370dcf', '675e7db4-1212-481a-b348-9b7aa8178cbe', '10842b38-4a80-490d-ada3-b3fc35d91822', 'admin', '2025-12-29 15:32:29.974118+00'),
('a55f530d-345c-4ae8-aa72-636d7bcd3caa', '675e7db4-1212-481a-b348-9b7aa8178cbe', '8569be04-9e86-49d8-9714-3d81423e836e', 'admin', '2025-12-30 00:51:24.906939+00'),
('bead2f0b-d357-472e-ac73-bd32f34b44c6', '3b25879c-6655-47c8-ae81-41c01744e1a3', '080f2eff-66ce-472d-9c42-51895e1cdb5d', 'admin', '2025-12-30 22:15:34.502506+00'),
('35dae1ea-e6fa-40ba-8a0b-b223d7b95a79', '2651cbc6-c9c9-47ae-a3e7-e3440b407145', '425c20c8-834c-47d2-93a0-b127f8bfca8e', 'admin', '2025-12-31 14:03:22.596905+00'),
('d01df388-a7ac-4398-8e75-b463f4bf5c81', '2651cbc6-c9c9-47ae-a3e7-e3440b407145', '1fe7a882-c0da-4f1c-804a-941322d51424', 'admin', '2025-12-31 14:04:42.553692+00'),
('024b6cdd-60bb-417a-8dd4-b5e379243815', 'd6091100-8b43-4368-9192-d1bc829b77e4', '07938b54-9e18-4325-adc6-8c398b9ee242', 'owner', '2026-01-05 22:27:41.604473+00'),
('932fe928-27a2-4f07-8e9c-8199a1c45407', '4ec517da-a013-49bf-af60-371109e83656', '3fb470f3-8186-4425-901a-30e26dd4d727', 'owner', '2026-01-06 20:58:31.742611+00'),
('fdde4b03-eae5-4ae3-b20c-7c941dad4fff', '3d4de2e3-29c5-4f8f-b61e-fa1a07e5c33c', 'c13dc42b-4734-4e08-a908-55be61f2ff62', 'owner', '2026-01-07 20:09:33.601914+00'),
('a06f94ef-d39b-47b8-9d37-8403ecfdf1e5', '2651cbc6-c9c9-47ae-a3e7-e3440b407145', '192e2dda-fd3d-4e70-81c4-9e255dc8c4e8', 'owner', '2026-01-13 14:32:09.511209+00'),
('50bc44a5-107c-42d5-ade6-ca4a2099517e', '226d5e7b-acae-4e85-a713-112ead7bfbe3', 'a72463b5-595c-4a79-a0a5-2403b1df04bb', 'owner', '2026-01-14 21:03:29.408135+00'),
('d04fd13f-d0b9-44af-b89f-d9dbfef32cdb', '035b6a81-cf76-4fab-9f73-40cb0172196d', 'ebc0392d-9f21-4966-8a83-777c1842413e', 'owner', '2026-01-15 17:09:00.612357+00'),
('454cb64b-52ea-4087-a4ca-4ec3ba56356f', '2dd66c1e-33fe-465f-9f53-e7a6a8f85a4a', '8faa68b6-5b17-4f8e-a89b-f0a560b7b000', 'admin', '2026-01-17 03:13:50.737101+00'),
('863e0968-d464-4ad6-b5e8-4e91094048a3', '4ec517da-a013-49bf-af60-371109e83656', '230389fb-312c-4398-9aec-a3d75f16e539', 'admin', '2026-01-22 15:46:26.383715+00'),
('6c9b3d74-5c85-4c0d-8ca6-03c353e3fd6e', '4ec517da-a013-49bf-af60-371109e83656', 'cb45d594-00df-4ebe-afcd-91dda8688e82', 'owner', '2026-01-22 15:00:53.87834+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASO 10: Re-habilitar Foreign Keys
-- ============================================================
SET session_replication_role = 'origin';

-- ============================================================
-- NOTAS IMPORTANTES
-- ============================================================
-- 
-- 1. PROFILES: Los perfiles dependen de auth.users. Debes:
--    - Crear usuarios vía Admin API de Supabase, o
--    - Que los usuarios hagan "Recuperar contraseña"
--
-- 2. ORGANIZATION_MEMBERS: Insertar después de profiles
--
-- 3. CONTENT (201 registros): Exportar desde Cloud View > Database > Tables > content
--    debido al tamaño de los datos (scripts, etc.)
--
-- 4. PRODUCTS (29 registros): Exportar desde Cloud View
--
-- 5. STORAGE: Las URLs de imágenes apuntan a hfooshsteglylhvrpuka.supabase.co
--    Debes actualizar a tu nuevo project ID después de migrar los archivos
--
-- ============================================================
-- TABLAS ADICIONALES PARA EXPORTAR MANUALMENTE VÍA CLOUD VIEW:
-- ============================================================
-- - profiles (56 registros) - contiene datos muy largos
-- - organization_members (57 registros)
-- - content (201 registros) - scripts HTML muy largos
-- - products (29 registros) - brief_data JSON muy largo
-- - portfolio_posts (53 registros)
-- - notifications (491 registros)
-- - chat_conversations (16 registros)
-- - chat_messages
-- - chat_participants
-- - client_packages (12 registros)
-- ============================================================
