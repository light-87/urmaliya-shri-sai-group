-- Migration: Add VINAY and SACHIN accounts
-- Date: 2025-12-17
-- Description: Adds two new expense accounts (VINAY and SACHIN) and updates constraints

-- Step 1: Add new accounts to expense_accounts table
INSERT INTO expense_accounts (code, name, display_name, account_type, is_active)
VALUES
  ('VINAY', 'Vinay', 'Vinay', 'BANK', true),
  ('SACHIN', 'Sachin', 'Sachin', 'BANK', true)
ON CONFLICT (code) DO NOTHING;

-- Step 2: Drop existing constraint on ExpenseTransaction table
ALTER TABLE "ExpenseTransaction" DROP CONSTRAINT IF EXISTS valid_account;

-- Step 3: Add updated constraint with new accounts
ALTER TABLE "ExpenseTransaction" ADD CONSTRAINT valid_account CHECK (account IN (
  'CASH', 'SHIVAM_TRIPATHI', 'ICICI', 'CC_CANARA', 'CANARA_CURRENT', 'SAWALIYA_SETH_MOTORS', 'VINAY', 'SACHIN'
));

-- Verification: Check that new accounts were added
SELECT code, name, display_name, account_type FROM expense_accounts WHERE code IN ('VINAY', 'SACHIN');
