-- Relanzamiento Kreoon / UGC Colombia — Fase 2b: configuracion de la organizacion operativa.
--
-- Identidad VERIFICADA en la base viva (2026-09-30), no inferida por nombre:
--   id c8ae6c6d-a15d-46d9-b69e-465f7371595e | slug 'ugc-colombia' | 376 miembros | 606 contenidos | 35 clientes
--   Es la unica fila de public.organizations. Se conserva el ID; NO se crea otra organizacion.
--
-- Cambios (solo configuracion de esa fila, sin mover ni copiar datos):
--   * name                        'KREOON' -> 'UGC Colombia'. La plataforma se sigue llamando Kreoon;
--                                 plataforma y organizacion son entidades distintas.
--   * is_registration_open        true  (inscripcion publica de creadores habilitada)
--   * registration_require_invite false (se retira el bloqueo por llaves/invitaciones; son opcionales)
--   * default_role                'content_creator' (antes 'client', incompatible con registro de creadores)
--   * is_default_registration_org true  (destino de /registro y accesos genericos del dominio raiz)
--
-- La guarda `AND slug = 'ugc-colombia'` evita tocar otra fila si el ID cambiara de significado.
-- NO se aplica a produccion sin autorizacion explicita de Alexander.

DO $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.organizations
  SET name = 'UGC Colombia',
      is_registration_open = true,
      registration_require_invite = false,
      default_role = 'content_creator',
      is_default_registration_org = true,
      updated_at = now()
  WHERE id = 'c8ae6c6d-a15d-46d9-b69e-465f7371595e'
    AND slug = 'ugc-colombia';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'UGC Colombia no encontrada con el ID/slug verificados (filas=%). Abortando.', v_count;
  END IF;
END $$;
