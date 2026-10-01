-- Relanzamiento Kreoon — Fase 5: color primario por defecto de la plataforma.
--
-- app_settings guarda hoy primary_color / theme_color = '#7700b8' (el morado anterior). El frontend ya
-- trata '#7700b8' y '#6D4AFF' como "color por defecto" (usa los tokens de marca de src/index.css), asi
-- que esta migracion es solo coherencia de datos: deja la configuracion de plataforma en la paleta
-- aprobada. Un color personalizado distinto de ambos (white-label) NO se toca.
UPDATE public.app_settings
SET value = '#6D4AFF', updated_at = now()
WHERE key IN ('primary_color', 'theme_color')
  AND lower(value) = '#7700b8';
