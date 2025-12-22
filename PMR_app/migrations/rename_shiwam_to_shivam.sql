-- Migration: Rename SHIWAM_TRIPATHI to SHIVAM_TRIPATHI
-- Date: 2025-12-22
-- Description: Updates the spelling of Shiwam to Shivam in the expense_accounts table
--              and all related expense transactions

-- ============================================================================
-- STEP 1: Update the expense_accounts table
-- ============================================================================

-- Update the account code, name, and display_name in expense_accounts table
UPDATE expense_accounts
SET
  code = 'SHIVAM_TRIPATHI',
  name = 'Shivam Tripathi',
  display_name = 'Shivam Tripathi'
WHERE code = 'SHIWAM_TRIPATHI';

-- ============================================================================
-- STEP 2: Update all expense transactions with the old account code
-- ============================================================================

-- Update all expense transactions that reference the old account code
UPDATE "ExpenseTransaction"
SET account = 'SHIVAM_TRIPATHI'
WHERE account = 'SHIWAM_TRIPATHI';

-- ============================================================================
-- STEP 3: Update the database constraint (if exists)
-- ============================================================================

-- Drop the existing account constraint
ALTER TABLE "ExpenseTransaction" DROP CONSTRAINT IF EXISTS valid_account;

-- Add the updated constraint with the new account name
ALTER TABLE "ExpenseTransaction" ADD CONSTRAINT valid_account CHECK (account IN (
  'CASH', 'SHIVAM_TRIPATHI', 'ICICI', 'CC_CANARA', 'CANARA_CURRENT', 'SAWALIYA_SETH_MOTORS', 'VINAY', 'SACHIN'
));

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

-- Verify the expense_accounts table update
SELECT code, name, display_name, account_type
FROM expense_accounts
WHERE code = 'SHIVAM_TRIPATHI';

-- Verify no transactions remain with the old account code
SELECT COUNT(*) as old_account_count
FROM "ExpenseTransaction"
WHERE account = 'SHIWAM_TRIPATHI';

-- Show success message
SELECT 'Migration Complete: SHIWAM_TRIPATHI renamed to SHIVAM_TRIPATHI' as status;
