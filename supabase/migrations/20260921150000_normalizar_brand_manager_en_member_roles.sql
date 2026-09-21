-- Normalizar `brand_manager` -> `client` en organization_member_roles.
--
-- La migración 20260515140000 hizo esta misma normalización SOLO en
-- `organization_members`, pero `organization_member_roles` es la tabla que
-- `useAuth` lee como fuente canónica de roles (organization_members.role es
-- apenas el fallback). Resultado: 10 filas quedaron con `brand_manager`, un
-- rol que `getPermissionGroup()` no conoce y que por eso caía en el default
-- 'talent'. Esos 9 clientes reales (todos con empresa en client_users y
-- user_type='client') eran tratados como TALENTO por toda la plataforma:
-- veían el menú de creador (Academia, Social Hub, Guiones, Portafolio),
-- pasaban los guards de rutas de talento y no los tomaba ningún guard de
-- cliente. La fila número 10 es huérfana (sin profile ni organization_members).
--
-- El mapeo también se agregó en src/lib/permissionGroups.ts para que cualquier
-- fila futura con este rol legacy se comporte como cliente sin depender de
-- que los datos estén normalizados.

UPDATE organization_member_roles
SET role = 'client'
WHERE role = 'brand_manager';

UPDATE organization_member_roles
SET role = 'client'
WHERE role = 'marketing_director';
