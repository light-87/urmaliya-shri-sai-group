-- ============================================================================
-- SUPABASE FUNCTION SEARCH PATH FIX
-- Purpose: Fix function search_path security warnings
-- Date: December 17, 2024
-- ============================================================================
--
-- IMPORTANT: This script fixes Supabase security linter warnings by setting
-- a fixed search_path on PostgreSQL functions to prevent search path attacks.
--
-- Security Issue: Functions without a fixed search_path can be vulnerable
-- to attacks where malicious users create objects in schemas that appear
-- earlier in the search path, causing the function to use those instead
-- of the intended objects.
--
-- Solution: Recreate functions with SET search_path = '' to use only
-- fully qualified names or SET search_path = public, pg_temp for safety.
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: update_updated_at_column
-- ============================================================================
-- Description: Trigger function to automatically update updated_at timestamp
-- Used by: Multiple tables with updated_at columns
-- Fix: Add SET search_path to function definition
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS 'Automatically updates updated_at timestamp on row updates (search_path protected)';

-- ============================================================================
-- FUNCTION 2: get_next_registry_transaction_id
-- ============================================================================
-- Description: Generates next sequential registry transaction ID
-- Returns: VARCHAR(10) in format REG001, REG002, etc.
-- Fix: Add SET search_path to function definition
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_registry_transaction_id()
RETURNS VARCHAR(10)
SET search_path = public, pg_temp
AS $$
DECLARE
  last_number INTEGER;
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_id FROM 4) AS INTEGER)), 0)
  INTO last_number
  FROM registry_transactions
  WHERE transaction_id ~ '^REG[0-9]{3}$';

  next_number := last_number + 1;
  RETURN 'REG' || LPAD(next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_registry_transaction_id IS 'Generates next sequential registry transaction ID (REG001, REG002, etc.) - search_path protected';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check function definitions include search_path
SELECT
    n.nspname as schema_name,
    p.proname as function_name,
    CASE
        WHEN p.proconfig IS NULL THEN 'NO search_path set ⚠️'
        WHEN array_to_string(p.proconfig, ', ') LIKE '%search_path%' THEN 'search_path SET ✅'
        ELSE 'NO search_path set ⚠️'
    END as search_path_status,
    array_to_string(p.proconfig, ', ') as configuration
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('update_updated_at_column', 'get_next_registry_transaction_id')
ORDER BY p.proname;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '✅ Function Search Path Fix Complete!' AS status;
SELECT
    '🔒 Fixed 2 functions with secure search_path' AS details
UNION ALL
SELECT '✓ update_updated_at_column - search_path protected'
UNION ALL
SELECT '✓ get_next_registry_transaction_id - search_path protected'
UNION ALL
SELECT '✓ All function security warnings should now be resolved';

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================

/*
SECURITY IMPLEMENTATION NOTES:

1. WHAT IS search_path?
   - search_path determines which schemas PostgreSQL searches for objects
   - Without a fixed search_path, functions use the caller's search_path
   - This can lead to security vulnerabilities (search path attacks)

2. THE ATTACK SCENARIO:
   Without fixed search_path, a malicious user could:
   a. Create a schema that appears earlier in the search path
   b. Create malicious functions/tables with the same names
   c. When your function runs, it might use the malicious objects
   d. This can lead to privilege escalation or data theft

3. THE FIX:
   We added: SET search_path = public, pg_temp

   This means:
   - 'public' - The function only searches the public schema
   - 'pg_temp' - Allows use of temporary tables if needed
   - The function ignores the caller's search_path
   - Objects are accessed via fully qualified names or from public schema

4. WHY 'public, pg_temp'?
   - 'public' - Your tables are in the public schema
   - 'pg_temp' - Standard practice to include temp schema
   - This is the minimal secure search_path for your use case

5. ALTERNATIVE (More Strict):
   You could use: SET search_path = ''
   - This would require fully qualified names for ALL objects
   - Example: public.registry_transactions instead of registry_transactions
   - More secure but requires more changes to function code

6. AFFECTED FUNCTIONS:

   a. update_updated_at_column:
      - Used by triggers on multiple tables
      - Updates the updated_at timestamp automatically
      - Now protected against search path attacks

   b. get_next_registry_transaction_id:
      - Generates sequential transaction IDs
      - Queries registry_transactions table
      - Now protected against search path attacks

7. TESTING:
   After running this script, verify:
   - All table updates still work (updated_at changes)
   - Registry transaction ID generation still works
   - No errors in application logs

8. BEST PRACTICES FOR FUTURE FUNCTIONS:
   Always include SET search_path when creating new functions:

   CREATE OR REPLACE FUNCTION my_function()
   RETURNS void
   SET search_path = public, pg_temp  -- Add this line!
   AS $$
   BEGIN
     -- function code
   END;
   $$ LANGUAGE plpgsql;

EXECUTION INSTRUCTIONS:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create a new query
4. Paste this entire script
5. Click "Run" or press Cmd/Ctrl + Enter
6. Verify the verification query shows "search_path SET ✅"
7. Run the security linter again to verify warnings are gone
8. Test your application to ensure everything works

For more information:
- Supabase Linter: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- PostgreSQL search_path: https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-SEARCH-PATH
- Security considerations: https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH
*/

-- ============================================================================
-- END OF FUNCTION SEARCH PATH FIX SCRIPT
-- ============================================================================
