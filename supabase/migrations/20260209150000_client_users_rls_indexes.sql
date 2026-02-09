-- Speed up RLS policy evaluation on the clients table.
-- The "Associated users can view their client" policy uses:
--   EXISTS (SELECT 1 FROM client_users WHERE client_users.client_id = clients.id AND client_users.user_id = auth.uid())
-- Without an index on (user_id, client_id), this is a sequential scan per row.

-- Index for user-based lookups (most common RLS pattern)
CREATE INDEX IF NOT EXISTS idx_client_users_user_client
  ON client_users (user_id, client_id);

-- Index for client-based lookups (used in owner management policy)
CREATE INDEX IF NOT EXISTS idx_client_users_client_role
  ON client_users (client_id, role);

-- Index on clients.organization_id for the org member policy
CREATE INDEX IF NOT EXISTS idx_clients_organization
  ON clients (organization_id);
