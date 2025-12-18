-- Agregar nuevos valores al enum content_status
-- Nota: Los estados existentes se mantienen por compatibilidad
-- Nuevos estados: asignado, grabado, entregado, novedad

-- Añadir nuevos valores al enum
ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'assigned';
ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'recorded';
ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'issue';

-- Actualizar contenido existente con estados antiguos a nuevos equivalentes
-- draft -> draft (se mantiene igual, representa "creado")
-- script_pending -> se puede mantener o convertir
-- Los demás se mantienen compatibles