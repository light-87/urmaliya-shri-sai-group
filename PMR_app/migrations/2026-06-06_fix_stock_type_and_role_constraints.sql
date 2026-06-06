-- ============================================================================
-- Migration: Fix CHECK constraints that are out of sync with the app code
-- Date: 2026-06-06
-- Run this manually in the Supabase SQL editor.
--
-- 1. "StockTransaction".valid_stock_type is missing 'RETURN_BUCKETS'.
--    The Return Buckets feature (added Mar 2026) inserts rows with
--    type = 'RETURN_BUCKETS'; on a DB with the old constraint every attempt
--    fails with a CHECK violation (HTTP 500) AFTER the inventory row was
--    already written, desyncing the two tables.
--
-- 2. pins.valid_role is missing 'LEADS'. The app supports a LEADS role
--    (auth, middleware, header), but the constraint makes such pins
--    unprovisionable, and backup-restore silently drops them.
--
-- Both statements are idempotent — safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 0 (optional): check whether the live DB is actually affected.
-- Run these SELECTs first; if the constraint definition already contains
-- RETURN_BUCKETS / LEADS, the matching ALTER below is a no-op.
-- ----------------------------------------------------------------------------
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--  WHERE conrelid = '"StockTransaction"'::regclass;
--
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--  WHERE conrelid = 'pins'::regclass;
--
-- Has Return Buckets ever worked on this DB? (0 rows = it never has)
-- SELECT count(*) FROM "StockTransaction" WHERE type = 'RETURN_BUCKETS';

-- ----------------------------------------------------------------------------
-- STEP 1: allow RETURN_BUCKETS stock transactions
-- ----------------------------------------------------------------------------
ALTER TABLE "StockTransaction" DROP CONSTRAINT IF EXISTS valid_stock_type;
ALTER TABLE "StockTransaction" ADD CONSTRAINT valid_stock_type CHECK (type IN (
  'ADD_UREA', 'PRODUCE_BATCH', 'SELL_FREE_DEF', 'FILL_BUCKETS', 'SELL_BUCKETS', 'RETURN_BUCKETS'
));

-- ----------------------------------------------------------------------------
-- STEP 2: allow LEADS role pins
-- ----------------------------------------------------------------------------
ALTER TABLE pins DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE pins ADD CONSTRAINT valid_role CHECK (role IN (
  'ADMIN', 'EXPENSE_INVENTORY', 'INVENTORY_ONLY', 'REGISTRY_MANAGER', 'LEADS'
));

-- ----------------------------------------------------------------------------
-- STEP 3: verify
-- ----------------------------------------------------------------------------
SELECT conname, pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE conrelid IN ('"StockTransaction"'::regclass, 'pins'::regclass)
   AND conname IN ('valid_stock_type', 'valid_role');
