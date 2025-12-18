-- ============================================================================
-- Migration: Fix updatedAt Trigger for CamelCase Transaction Tables
-- ============================================================================
-- Date: 2024-12-18
-- Author: Claude
-- Description: The transaction tables (InventoryTransaction, ExpenseTransaction,
--              StockTransaction) use camelCase "updatedAt" columns, but the
--              trigger function was trying to update snake_case "updated_at".
--              This migration creates a new trigger function for camelCase tables
--              and updates the triggers on the three transaction tables.
-- ============================================================================

-- ============================================================================
-- STEP 1: Create new trigger function for camelCase updatedAt columns
-- ============================================================================

CREATE OR REPLACE FUNCTION update_camelcase_updated_at_column()
RETURNS TRIGGER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_camelcase_updated_at_column IS 'Automatically updates "updatedAt" timestamp (camelCase) on row updates';

-- ============================================================================
-- STEP 2: Drop existing triggers on transaction tables
-- ============================================================================

DROP TRIGGER IF EXISTS update_inventory_transaction_updated_at ON "InventoryTransaction";
DROP TRIGGER IF EXISTS update_expense_transaction_updated_at ON "ExpenseTransaction";
DROP TRIGGER IF EXISTS update_stock_transaction_updated_at ON "StockTransaction";

-- ============================================================================
-- STEP 3: Create new triggers using the camelCase function
-- ============================================================================

CREATE TRIGGER update_inventory_transaction_updated_at
  BEFORE UPDATE ON "InventoryTransaction"
  FOR EACH ROW
  EXECUTE FUNCTION update_camelcase_updated_at_column();

CREATE TRIGGER update_expense_transaction_updated_at
  BEFORE UPDATE ON "ExpenseTransaction"
  FOR EACH ROW
  EXECUTE FUNCTION update_camelcase_updated_at_column();

CREATE TRIGGER update_stock_transaction_updated_at
  BEFORE UPDATE ON "StockTransaction"
  FOR EACH ROW
  EXECUTE FUNCTION update_camelcase_updated_at_column();

-- ============================================================================
-- STEP 4: Verify the triggers are working
-- ============================================================================

-- You can verify by running:
-- SELECT tgname, tgrelid::regclass, proname
-- FROM pg_trigger
-- JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
-- WHERE tgname LIKE '%updated_at%';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- To rollback this migration, run:
--
-- DROP TRIGGER IF EXISTS update_inventory_transaction_updated_at ON "InventoryTransaction";
-- DROP TRIGGER IF EXISTS update_expense_transaction_updated_at ON "ExpenseTransaction";
-- DROP TRIGGER IF EXISTS update_stock_transaction_updated_at ON "StockTransaction";
-- DROP FUNCTION IF EXISTS update_camelcase_updated_at_column();
--
-- Then recreate the old triggers with the old function (update_updated_at_column)
-- ============================================================================
