-- ============================================================
-- SCRIPT DE RESTAURACIÓN DE RELACIONES - UGC Colombia
-- Origen: Lovable Cloud (hfooshsteglylhvrpuka)
-- Destino: Kreoon (wjkbqcrxwsmvtxmqgiqc)
-- Fecha: 2026-01-30
-- ============================================================
-- IMPORTANTE: Ejecutar en el SQL Editor de Kreoon

SET session_replication_role = 'replica';

-- ============================================================
-- PASO 1: PROFILES - Crear perfiles faltantes
-- (Solo inserta si el ID no existe ya en profiles)
-- ============================================================

INSERT INTO public.profiles (id, email, full_name, created_at, updated_at, current_organization_id)
VALUES
  ('06aa55b0-61ea-41f0-9708-7a3d322b6795', 'jacsolucionesgraficas@gmail.com', 'Alexander Cast', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('8faa68b6-5b17-4f8e-a89b-f0a560b7b000', 'kairosgp.sas@gmail.com', 'Kairos GP', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('61bdffb0-c704-4fae-ac3b-59420242fc5a', 'imcamilarestrepo@gmail.com', 'Maria Camila Restrepo', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('2f848aa7-56ae-4b51-982d-ff5e8d45637b', 'carolinaov24@hotmail.com', 'Carolina Osorio', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('10842b38-4a80-490d-ada3-b3fc35d91822', 'ale312109@gmail.com', 'Alejandra Giraldo Alzate', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('45f51c68-6c95-40c8-a5c3-4fdd792edd0d', 'mile_160711@hotmail.com', 'Diana milena torres lopez', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('8569be04-9e86-49d8-9714-3d81423e836e', 'alexander7818@gmail.com', 'Alexander', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('cf4ba26d-888e-4df4-934e-7d720f7dc8d1', 'romerosebastian132@gmail.com', 'Sebastian Romero', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('efb01b27-1100-488d-aa59-34aee64767e7', 'ktevoluciona@gmail.com', 'katherine Acevedo Sánchez', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('d533bf9b-e7b7-48c7-be84-ef125688bde8', 'egiraldo602@gmail.com', 'Esteban Giraldo', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('dead16de-fe19-410c-a684-92584b7510c1', 'juanita.osocar@gmail.com', 'Juanita osorio carmona', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('4df21b6d-2a7d-4ea3-b3b9-0b26ce51df31', 'andreatabares117@gmail.com', 'Yuli Andrea tabares', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('15ed42a0-62fc-401b-8db0-f7464aa863ef', 'stefa.mdigital@gmail.com', 'Stefany aguirre diaz', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('3b20499e-3d16-496b-bbd3-b3cc4b163fdf', 'moncadaandrea419@gmail.com', 'Natalia Andrea Moncada Benjumea', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('507328d1-861d-49bc-8d64-b0a6927ac296', 'valexanieto@gmail.com', 'Vanesa Alexandra Nieto Peñaloza', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('258047cf-198c-4112-8ab6-bed278ec9f3a', 'isabelojeda90@gmail.com', 'María Isabel Ojeda G.', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('b44b5148-b3e4-452e-8b11-5e3ba59a336a', 'valegiraldor@icloud.com', 'Valentina Giraldo', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('ffed6433-76f2-48dc-926c-ec54a5088709', 'juanbotero@naicipa.com', 'Juan Botero', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('ed6d109a-c72d-4e3c-9f61-c8d7d5ff30a6', 'camila.hoyosra@amigo.edu.co', 'Camila Hoyos Ramírez', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('f3301bce-ab88-4465-82f3-b9c87b2bfa96', 'travelapp.gerencia@gmail.com', 'Sebastian Patiño', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('76d69db1-2532-4319-a55d-f07e1e91a950', 'danielajimenezmejia@gmail.com', 'Daniela Jiménez Mejía', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('5e212d1b-9ca5-4b11-b16a-be8225475cd0', 'bt.ricardo227@gmail.com', 'Ricardo Bedoya Traslaviña', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('c3d58e31-4d36-4549-8493-78c334991c2a', 'valmarugc@gmail.com', 'Valeria Martínez Muñoz', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('9fc916cc-cfce-4189-a274-c041eb05fb38', 'jorgeenriquegarnicacoach@gmail.com', 'Jorge enrique Garnica C', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('e326d174-58a6-4d37-a603-c91a6131826d', 'susanagallego12@hotmail.com', 'Susana', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('080f2eff-66ce-472d-9c42-51895e1cdb5d', 'kmanquiz03@gmail.com', 'Karolay Anquiz', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('425c20c8-834c-47d2-93a0-b127f8bfca8e', 'amoncada@smartbeemo.com', 'Ana Gabriela Moncada', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('1fe7a882-c0da-4f1c-804a-941322d51424', 'jperez@smartbeemo.com', 'Jefferson Perez Barrios', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('ecb07d81-5377-413e-ac3a-2dcf38bbc852', 'alexanderkastt@gmail.com', 'Johan Alexander Castaño Cespedes', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('85b4bd6b-8dae-46c7-8e3e-eaa9080eb76a', 'mariacamilanaranjo12@gmail.com', 'Maria Camila Naranjo Hurtado', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('07938b54-9e18-4325-adc6-8c398b9ee242', 'gerencia@fexeblinkspa.com', 'Gerencia Fexe BlinkSpa', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('3fb470f3-8186-4425-901a-30e26dd4d727', 'admin@gpsportslab.co', 'Admin GP Sports Lab', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('c13dc42b-4734-4e08-a908-55be61f2ff62', 'contacto@laboratoriosoluna.com', 'Laboratorio Soluna', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('192e2dda-fd3d-4e70-81c4-9e255dc8c4e8', 'importacionestokio.ventas@gmail.com', 'Importaciones Tokio', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('a72463b5-595c-4a79-a0a5-2403b1df04bb', 'misorganizadores.info@gmail.com', 'Mis Organizadores', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('ebc0392d-9f21-4966-8a83-777c1842413e', 'maribelcubides7@gmail.com', 'Maribel Cubides', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('cb45d594-00df-4ebe-afcd-91dda8688e82', 'facturacion@gpsportslab.co', 'Facturacion GP Sports', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('230389fb-312c-4398-9aec-a3d75f16e539', 'comercial@gpsportslab.co', 'Comercial GP Sports', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('3ff11e10-b87a-47af-8dfc-8b4c396cfc47', 'jucasa.soporte@gmail.com', 'Jucasa Soporte', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('90437623-38e8-4c43-9f9b-e2643ed75bf8', 'estrategia@ugccolombia.com', 'Estrategia UGC', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('47471e16-70da-4e6a-9cb6-efdcd0da6844', 'creador1@ugccolombia.com', 'Creador Test', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('9669d059-8098-45ce-b273-ac834a303a98', 'embajador1@ugccolombia.com', 'Embajador Test', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('ec970313-45df-41e5-9919-92a20d27caf0', 'creador2@ugccolombia.com', 'Creador2 Test', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('f5f4b7b9-d160-4704-b515-a86f0313246d', 'creador3@ugccolombia.com', 'Creador3 Test', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('2fa56b9d-33ae-4925-958c-57851c68d104', 'creador4@ugccolombia.com', 'Creador4 Test', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('e8b7312a-803b-4d7c-b9a1-2b7cf53fd682', 'creador5@ugccolombia.com', 'Creador5 Test', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'),
  ('1dd2ad4b-01ea-4001-8a01-8e3d14399a14', 'creador6@ugccolombia.com', 'Creador6 Test', now(), now(), 'c8ae6c6d-a15d-46d9-b69e-465f7371595e')
ON CONFLICT (id) DO UPDATE SET
  current_organization_id = EXCLUDED.current_organization_id,
  updated_at = now();


-- ============================================================
-- PASO 2: ORGANIZATION MEMBERS
-- (Restaurar membresías completas)
-- ============================================================

INSERT INTO public.organization_members (id, organization_id, user_id, role, joined_at)
VALUES
  ('139a3c57-99ad-410a-893d-ef39eca9cc21', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'efb01b27-1100-488d-aa59-34aee64767e7', 'creator', '2025-12-26 23:01:49.524679+00'),
  ('6f40641f-82f5-4c9c-a2e7-d9433ff2c381', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'dead16de-fe19-410c-a684-92584b7510c1', 'creator', '2025-12-26 23:01:49.524679+00'),
  ('b82082de-29e4-4df0-aace-9c385a2cdd56', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '4df21b6d-2a7d-4ea3-b3b9-0b26ce51df31', 'creator', '2025-12-26 23:01:49.524679+00'),
  ('f2bb8ad8-9a55-4e8c-8efa-8ffaf5ca96ea', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '507328d1-861d-49bc-8d64-b0a6927ac296', 'creator', '2025-12-26 23:01:49.524679+00'),
  ('efd09bb4-45f1-4eea-9ab7-221b3da1e37d', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'ffed6433-76f2-48dc-926c-ec54a5088709', 'client', '2025-12-26 23:01:49.524679+00'),
  ('d0fe541c-be4d-4443-a126-f8af036d4fa2', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '258047cf-198c-4112-8ab6-bed278ec9f3a', 'creator', '2025-12-26 23:01:49.524679+00'),
  ('1967edf2-aec6-420c-b8d8-d54e352adb28', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'f3301bce-ab88-4465-82f3-b9c87b2bfa96', 'client', '2025-12-26 23:01:49.524679+00'),
  ('acd783da-bc5a-43d2-bc6f-814f5dde6df7', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '3b20499e-3d16-496b-bbd3-b3cc4b163fdf', 'creator', '2025-12-26 23:01:49.524679+00'),
  ('ec2370d8-74fb-41fa-aa52-f878bb91f998', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '61bdffb0-c704-4fae-ac3b-59420242fc5a', 'creator', '2025-12-26 23:01:49.524679+00'),
  ('06cf2161-728f-4024-aa1b-0d065718edd6', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '76d69db1-2532-4319-a55d-f07e1e91a950', 'creator', '2025-12-26 23:01:49.524679+00'),
  ('4593c099-50d1-487f-ad51-9f5de05ef408', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'b44b5148-b3e4-452e-8b11-5e3ba59a336a', 'creator', '2025-12-26 23:01:49.524679+00'),
  ('dd42e1a0-80e9-4431-bdd5-501e2d3b4614', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'ed6d109a-c72d-4e3c-9f61-c8d7d5ff30a6', 'creator', '2025-12-26 23:01:49.524679+00'),
  ('e4cc227e-a34b-4f89-81dd-96f89ec0cfad', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '45f51c68-6c95-40c8-a5c3-4fdd792edd0d', 'admin', '2025-12-26 23:01:49.524679+00'),
  ('4af2475e-08f5-4985-8da4-b6118fab2f05', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '2f848aa7-56ae-4b51-982d-ff5e8d45637b', 'creator', '2025-12-26 23:01:49.524679+00'),
  ('7e1db676-6802-4a4c-bc74-9e81c8da9571', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '10842b38-4a80-490d-ada3-b3fc35d91822', 'admin', '2025-12-26 23:01:49.524679+00'),
  ('8154ec30-7514-4f5e-9923-f3c8c9bad3da', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '15ed42a0-62fc-401b-8db0-f7464aa863ef', 'creator', '2025-12-26 23:01:49.524679+00'),
  ('ff0dc71e-6ccb-4ea1-bff8-4a9aa9ec3c0d', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'd533bf9b-e7b7-48c7-be84-ef125688bde8', 'editor', '2025-12-26 23:01:49.524679+00'),
  ('13acf530-fb49-4203-855a-82686d185ce1', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'cf4ba26d-888e-4df4-934e-7d720f7dc8d1', 'editor', '2025-12-26 23:01:49.524679+00'),
  ('cc231004-1f74-473a-bf7f-84dfb2d6ea6b', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '06aa55b0-61ea-41f0-9708-7a3d322b6795', 'admin', '2025-12-27 08:45:25.950092+00'),
  ('741b16fd-b0ab-474c-b10e-abb582324539', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '8faa68b6-5b17-4f8e-a89b-f0a560b7b000', 'admin', '2025-12-27 15:54:55.4593+00'),
  ('9f1d5e5a-d905-407c-8f7c-3c4bd1597923', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '5e212d1b-9ca5-4b11-b16a-be8225475cd0', 'creator', '2025-12-27 15:56:08.728495+00'),
  ('28ef50b5-1386-4a28-9f03-352c2a2a34fe', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'c3d58e31-4d36-4549-8493-78c334991c2a', 'creator', '2025-12-28 06:07:42.607152+00'),
  ('0835273d-d5d2-4bfc-b727-cdf6181fda91', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '8569be04-9e86-49d8-9714-3d81423e836e', 'strategist', '2025-12-29 19:07:31.468281+00')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PASO 3: ORGANIZATION MEMBER ROLES
-- (Restaurar roles múltiples)
-- ============================================================

INSERT INTO public.organization_member_roles (id, organization_id, user_id, role)
VALUES
  ('00c12bd4-f146-48e8-9182-161cf8b871ae', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '07938b54-9e18-4325-adc6-8c398b9ee242', 'client'),
  ('00ed52e4-c067-4d91-98fb-7f552319bc82', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '8569be04-9e86-49d8-9714-3d81423e836e', 'editor'),
  ('02530a8e-9bee-464c-9e87-0c154cac5d50', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '3ff11e10-b87a-47af-8dfc-8b4c396cfc47', 'client'),
  ('06849144-1546-47c1-a046-f9b3e6eafaa7', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '47471e16-70da-4e6a-9cb6-efdcd0da6844', 'creator'),
  ('086eae05-0833-43af-9748-4b1a705f9b49', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'cb45d594-00df-4ebe-afcd-91dda8688e82', 'client'),
  ('0b9a994f-0a83-4136-ae77-c8b75988eeca', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '230389fb-312c-4398-9aec-a3d75f16e539', 'creator'),
  ('0bfa4d33-6c92-45d5-bb3e-8c9f00ea7031', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '2f848aa7-56ae-4b51-982d-ff5e8d45637b', 'creator'),
  ('0f74ed79-85e2-4fb9-9e30-a1b4c0c3357d', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '507328d1-861d-49bc-8d64-b0a6927ac296', 'creator'),
  ('13f20d40-0c6b-4332-a95e-d93f3fe1eaa9', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '06aa55b0-61ea-41f0-9708-7a3d322b6795', 'creator'),
  ('15493e1e-126b-4d66-b04d-41d3c33d3745', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'b44b5148-b3e4-452e-8b11-5e3ba59a336a', 'creator'),
  ('15808532-7292-4192-be2a-1a7ff36b9945', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '06aa55b0-61ea-41f0-9708-7a3d322b6795', 'strategist'),
  ('1802df3b-3355-48e0-b59f-12d63c685fd2', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '5e212d1b-9ca5-4b11-b16a-be8225475cd0', 'ambassador'),
  ('19531a4f-837b-4c9b-bf83-62f15e644d3a', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '10842b38-4a80-490d-ada3-b3fc35d91822', 'creator'),
  ('19e0bc54-8d67-4642-a0a0-2b5d6f221ccb', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'ec970313-45df-41e5-9919-92a20d27caf0', 'creator'),
  ('1a69c873-ea4e-4ea4-a7c8-ff4a777de268', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '9669d059-8098-45ce-b273-ac834a303a98', 'ambassador'),
  ('24496e47-d69b-44ff-a425-ff2f5f0c698a', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '85b4bd6b-8dae-46c7-8e3e-eaa9080eb76a', 'editor'),
  ('25493014-d5ac-4206-beb0-49aa41b008e3', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'e326d174-58a6-4d37-a603-c91a6131826d', 'creator'),
  ('2a5bfa63-eecc-472c-a0f8-a9c7e93d7800', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'ed6d109a-c72d-4e3c-9f61-c8d7d5ff30a6', 'creator'),
  ('2df57704-19ed-432a-b6bf-14de58ae02da', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'f5f4b7b9-d160-4704-b515-a86f0313246d', 'creator'),
  ('3e998ad2-3f63-4b32-b0f9-a7228b10ae24', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '2fa56b9d-33ae-4925-958c-57851c68d104', 'creator'),
  ('409c168d-4abb-44d6-a4d3-119103829528', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'efb01b27-1100-488d-aa59-34aee64767e7', 'creator'),
  ('415dde31-16fc-4d2e-9772-6aa9a321ac35', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '10842b38-4a80-490d-ada3-b3fc35d91822', 'client'),
  ('494796a9-8c7a-4012-9466-b49264546dff', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '1fe7a882-c0da-4f1c-804a-941322d51424', 'client'),
  ('4add2a01-8718-4dbd-8777-bba5f5e64f92', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '90437623-38e8-4c43-9f9b-e2643ed75bf8', 'strategist'),
  ('4b087e2a-b674-4a73-a453-bbfe2bc00fee', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '080f2eff-66ce-472d-9c42-51895e1cdb5d', 'client'),
  ('4b3a4849-d2aa-414a-9690-d467df96b402', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', 'e8b7312a-803b-4d7c-b9a1-2b7cf53fd682', 'creator'),
  ('4bae5e1c-3719-4390-bbd2-ecc51a21ec1c', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '192e2dda-fd3d-4e70-81c4-9e255dc8c4e8', 'client'),
  ('4c4c4794-6222-42b4-bcc8-da4c5bbb9861', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '4df21b6d-2a7d-4ea3-b3b9-0b26ce51df31', 'creator'),
  ('4c8c93a5-f697-4686-aa4b-09d15b20c554', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '76d69db1-2532-4319-a55d-f07e1e91a950', 'creator'),
  ('54ebc540-f806-4741-9409-49692ef33ffb', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '1dd2ad4b-01ea-4001-8a01-8e3d14399a14', 'creator'),
  ('5b58b6aa-dfc6-4458-8df8-10e7a8f1097b', 'c8ae6c6d-a15d-46d9-b69e-465f7371595e', '8569be04-9e86-49d8-9714-3d81423e836e', 'strategist')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PASO 4: CLIENT USERS
-- (Restaurar relación usuarios-empresas)
-- ============================================================

INSERT INTO public.client_users (id, client_id, user_id, role, created_at)
VALUES
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
  ('6c9b3d74-5c85-4c0d-8ca6-03c353e3fd6e', '4ec517da-a013-49bf-af60-371109e83656', 'cb45d594-00df-4ebe-afcd-91dda8688e82', 'owner', '2026-01-22 15:00:53.87834+00'),
  ('863e0968-d464-4ad6-b5e8-4e91094048a3', '4ec517da-a013-49bf-af60-371109e83656', '230389fb-312c-4398-9aec-a3d75f16e539', 'admin', '2026-01-22 15:46:26.383715+00'),
  ('b1bf6a2e-d082-4579-8ed3-0e7e6f647cc2', '226d5e7b-acae-4e85-a713-112ead7bfbe3', '3ff11e10-b87a-47af-8dfc-8b4c396cfc47', 'admin', '2026-01-27 17:25:07.454858+00')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PASO 5: REACTIVAR FOREIGN KEYS
-- ============================================================

SET session_replication_role = 'origin';


-- ============================================================
-- PASO 6: REPOBLAR TOTALES UP
-- (Con INNER JOIN a profiles para evitar FK violations)
-- ============================================================

DELETE FROM public.up_creadores_totals WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e';

INSERT INTO public.up_creadores_totals (
  user_id, organization_id, total_points, total_deliveries,
  on_time_deliveries, late_deliveries, total_issues,
  clean_approvals, reassignments, current_level, updated_at
)
SELECT
  e.user_id,
  e.organization_id,
  COALESCE(SUM(e.points), 0) AS total_points,
  COUNT(*) FILTER (WHERE e.event_type IN ('on_time_delivery','early_delivery','late_delivery')) AS total_deliveries,
  COUNT(*) FILTER (WHERE e.event_type IN ('on_time_delivery','early_delivery')) AS on_time_deliveries,
  COUNT(*) FILTER (WHERE e.event_type = 'late_delivery') AS late_deliveries,
  COUNT(*) FILTER (WHERE e.event_type = 'issue') AS total_issues,
  COUNT(*) FILTER (WHERE e.event_type = 'clean_approval') AS clean_approvals,
  COUNT(*) FILTER (WHERE e.event_type = 'reassignment') AS reassignments,
  CASE
    WHEN COALESCE(SUM(e.points), 0) >= 1200 THEN 'diamond'
    WHEN COALESCE(SUM(e.points), 0) >= 800 THEN 'gold'
    WHEN COALESCE(SUM(e.points), 0) >= 500 THEN 'silver'
    ELSE 'bronze'
  END AS current_level,
  now()
FROM public.up_creadores e
INNER JOIN public.profiles p ON p.id = e.user_id
WHERE e.organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
GROUP BY e.user_id, e.organization_id;


DELETE FROM public.up_editores_totals WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e';

INSERT INTO public.up_editores_totals (
  user_id, organization_id, total_points, total_deliveries,
  on_time_deliveries, late_deliveries, total_issues,
  clean_approvals, reassignments, current_level, updated_at
)
SELECT
  e.user_id,
  e.organization_id,
  COALESCE(SUM(e.points), 0) AS total_points,
  COUNT(*) FILTER (WHERE e.event_type IN ('on_time_delivery','early_delivery','late_delivery')) AS total_deliveries,
  COUNT(*) FILTER (WHERE e.event_type IN ('on_time_delivery','early_delivery')) AS on_time_deliveries,
  COUNT(*) FILTER (WHERE e.event_type = 'late_delivery') AS late_deliveries,
  COUNT(*) FILTER (WHERE e.event_type = 'issue') AS total_issues,
  COUNT(*) FILTER (WHERE e.event_type = 'clean_approval') AS clean_approvals,
  COUNT(*) FILTER (WHERE e.event_type = 'reassignment') AS reassignments,
  CASE
    WHEN COALESCE(SUM(e.points), 0) >= 1200 THEN 'diamond'
    WHEN COALESCE(SUM(e.points), 0) >= 800 THEN 'gold'
    WHEN COALESCE(SUM(e.points), 0) >= 500 THEN 'silver'
    ELSE 'bronze'
  END AS current_level,
  now()
FROM public.up_editores e
INNER JOIN public.profiles p ON p.id = e.user_id
WHERE e.organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
GROUP BY e.user_id, e.organization_id;


-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================

SELECT 'profiles' AS tabla, COUNT(*)::int AS registros FROM public.profiles WHERE current_organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
UNION ALL
SELECT 'organization_members', COUNT(*)::int FROM public.organization_members WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
UNION ALL
SELECT 'organization_member_roles', COUNT(*)::int FROM public.organization_member_roles WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
UNION ALL
SELECT 'client_users', COUNT(*)::int FROM public.client_users cu JOIN public.clients c ON c.id = cu.client_id WHERE c.organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
UNION ALL
SELECT 'up_creadores_totals', COUNT(*)::int FROM public.up_creadores_totals WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
UNION ALL
SELECT 'up_editores_totals', COUNT(*)::int FROM public.up_editores_totals WHERE organization_id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e';
