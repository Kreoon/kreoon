-- Agregar estado 'archived' al enum content_status
-- Reemplaza la columna "Pagado" del kanban; el contenido archivado es aquel
-- que ya fue pagado al 100% y se saca del flujo activo para no saturar "Aprobado"
ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'archived';
