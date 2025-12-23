
-- Actualizar descripciones de insignias para usar "Puntos de Honor" en lugar de "Puntos de Gloria"
UPDATE public.achievements 
SET description = REPLACE(description, 'puntos de gloria', 'puntos de honor')
WHERE description ILIKE '%puntos de gloria%';
