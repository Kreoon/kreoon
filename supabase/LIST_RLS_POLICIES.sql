-- ============================================
-- QUERY TO LIST ALL RLS POLICIES THAT FILTER BY ORGANIZATION
-- ============================================
-- Execute this in Supabase SQL Editor to see all policies that need superadmin bypass

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,  -- SELECT, INSERT, UPDATE, DELETE, or ALL
  qual  -- The USING clause (conditions)
FROM pg_policies
WHERE qual::text ILIKE '%organization%'
ORDER BY tablename, policyname;

-- ============================================
-- ALTERNATIVE: More detailed query with policy definitions
-- ============================================

SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  pol.polname AS policy_name,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END AS command,
  CASE pol.polpermissive
    WHEN true THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END AS permissive,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (
    pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%organization%'
    OR pg_get_expr(pol.polwithcheck, pol.polrelid) ILIKE '%organization%'
  )
ORDER BY c.relname, pol.polname;

-- ============================================
-- TABLES WITH RLS ENABLED
-- ============================================

SELECT
  schemaname,
  tablename,
  rowsecurity  -- true if RLS is enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true
ORDER BY tablename;
