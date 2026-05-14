-- Brian Velasquez — eliminación de perfil huérfano (sin auth.user)
-- Pancake CRM: ya eliminado (ID: 71bcb1f8-2e7b-482d-bc6f-6aeba8e0eb6d)
-- Ejecutar en Supabase Dashboard → SQL Editor

-- 1. Limpiar FK en products
UPDATE public.products
  SET deleted_by = NULL
  WHERE deleted_by = '24682c84-f492-410f-81f9-a1c9d5b10387';

-- 2. Limpiar content_items
UPDATE public.content_items SET created_by = NULL WHERE created_by = '24682c84-f492-410f-81f9-a1c9d5b10387';
UPDATE public.content_items SET assigned_to = NULL WHERE assigned_to = '24682c84-f492-410f-81f9-a1c9d5b10387';

-- 3. Eliminar membresías de organización
DELETE FROM public.organization_member_roles WHERE user_id = '24682c84-f492-410f-81f9-a1c9d5b10387';
DELETE FROM public.organization_members WHERE user_id = '24682c84-f492-410f-81f9-a1c9d5b10387';

-- 4. Eliminar perfil
DELETE FROM public.profiles WHERE id = '24682c84-f492-410f-81f9-a1c9d5b10387';
