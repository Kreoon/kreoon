-- Step 1: Add enum value (this must commit first before it can be used)
ALTER TYPE streaming_owner_type ADD VALUE IF NOT EXISTS 'client';