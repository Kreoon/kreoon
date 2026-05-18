-- Redistribuir contenido entre paquetes del mismo cliente respetando content_quantity
-- Contexto: el backfill anterior asignó todo el contenido de un cliente al paquete más
-- reciente sin respetar la capacidad. Este script redistribuye ordenando content y
-- paquetes por created_at ASC, llenando cada paquete hasta su capacity.
--
-- Clientes afectados (redistribuidos correctamente):
--   American Natural  27→10+10+7
--   BeHair            30→10+10+10
--   Equi Mayoristas   48→30+18
--   FAJAS XBELTIC      7→5+2
--   Importaciones Tokio 40→30+10
--   Mis Organizadores 30→10+10+10
--   Laboratorio Soluna 17→5+5+7 (2 excedentes; requiere paquete adicional)

WITH overloaded_clients AS (
  SELECT DISTINCT cp.client_id
  FROM client_packages cp
  JOIN content c ON c.client_package_id = cp.id
  GROUP BY cp.id, cp.client_id, cp.content_quantity
  HAVING COUNT(c.id) > cp.content_quantity
),
packages_ranked AS (
  SELECT
    cp.id AS package_id,
    cp.client_id,
    cp.content_quantity,
    SUM(cp.content_quantity) OVER (
      PARTITION BY cp.client_id ORDER BY cp.created_at ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cap_end,
    COALESCE(SUM(cp.content_quantity) OVER (
      PARTITION BY cp.client_id ORDER BY cp.created_at ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ), 0) AS cap_start
  FROM client_packages cp
  WHERE cp.client_id IN (SELECT client_id FROM overloaded_clients)
),
content_ranked AS (
  SELECT
    c.id AS content_id,
    c.client_id,
    c.client_package_id AS current_package_id,
    ROW_NUMBER() OVER (PARTITION BY c.client_id ORDER BY c.created_at ASC) AS content_rank
  FROM content c
  WHERE c.client_id IN (SELECT client_id FROM overloaded_clients)
    AND c.client_package_id IS NOT NULL
),
assignments AS (
  SELECT
    cr.content_id,
    pr.package_id AS new_package_id
  FROM content_ranked cr
  JOIN packages_ranked pr ON
    pr.client_id = cr.client_id
    AND cr.content_rank > pr.cap_start
    AND cr.content_rank <= pr.cap_end
  WHERE cr.current_package_id != pr.package_id
)
UPDATE content c
SET client_package_id = a.new_package_id
FROM assignments a
WHERE c.id = a.content_id;
