-- Migration: Allow zero amounts and add VINAY/SACHIN accounts
-- Date: 2025-12-17
-- Description:
--   1. Allows expense transactions with amount = 0
--   2. Adds VINAY and SACHIN accounts to expense_accounts table
--   3. Updates account constraint to include new accounts

-- ============================================================================
-- PART 1: Add new accounts (VINAY and SACHIN)
-- ============================================================================

-- Step 1: Add new accounts to expense_accounts table
INSERT INTO expense_accounts (code, name, display_name, account_type, is_active)
VALUES
  ('VINAY', 'Vinay', 'Vinay', 'BANK', true),
  ('SACHIN', 'Sachin', 'Sachin', 'BANK', true)
ON CONFLICT (code) DO NOTHING;

-- Step 2: Drop existing account constraint
ALTER TABLE "ExpenseTransaction" DROP CONSTRAINT IF EXISTS valid_account;

-- Step 3: Add updated account constraint with new accounts
ALTER TABLE "ExpenseTransaction" ADD CONSTRAINT valid_account CHECK (account IN (
  'CASH', 'SHIWAM_TRIPATHI', 'ICICI', 'CC_CANARA', 'CANARA_CURRENT', 'SAWALIYA_SETH_MOTORS', 'VINAY', 'SACHIN'
));

-- ============================================================================
-- PART 2: Allow zero amounts
-- ============================================================================

-- Step 4: Drop existing amount constraint
ALTER TABLE "ExpenseTransaction" DROP CONSTRAINT IF EXISTS positive_amount;

-- Step 5: Add updated amount constraint (allow zero)
ALTER TABLE "ExpenseTransaction" ADD CONSTRAINT positive_amount CHECK (amount >= 0);

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify new accounts were added
SELECT code, name, display_name, account_type
FROM expense_accounts
WHERE code IN ('VINAY', 'SACHIN');

-- Verify constraints were updated
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'ExpenseTransaction'
  AND con.conname IN ('valid_account', 'positive_amount');
