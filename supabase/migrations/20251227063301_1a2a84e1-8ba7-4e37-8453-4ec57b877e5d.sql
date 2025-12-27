-- Ensure upserts work by adding the required unique constraints
ALTER TABLE public.content_block_config
ADD CONSTRAINT content_block_config_org_block_key_unique UNIQUE (organization_id, block_key);

ALTER TABLE public.content_block_permissions
ADD CONSTRAINT content_block_permissions_org_block_role_unique UNIQUE (organization_id, block_key, role);

ALTER TABLE public.content_block_state_rules
ADD CONSTRAINT content_block_state_rules_org_status_block_unique UNIQUE (organization_id, status_id, block_key);

-- Helpful indexes for reads
CREATE INDEX IF NOT EXISTS idx_content_block_config_org ON public.content_block_config (organization_id);
CREATE INDEX IF NOT EXISTS idx_content_block_permissions_org_role ON public.content_block_permissions (organization_id, role);
CREATE INDEX IF NOT EXISTS idx_content_block_state_rules_org_status ON public.content_block_state_rules (organization_id, status_id);