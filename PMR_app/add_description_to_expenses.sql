-- Migration Script: Add description field to ExpenseTransaction table
-- Run this SQL in your Supabase SQL editor

-- Add description column to ExpenseTransaction table
ALTER TABLE "ExpenseTransaction"
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add a comment to the column for documentation
COMMENT ON COLUMN "ExpenseTransaction".description IS 'Description of the expense transaction';

-- Optional: Create an index on description for faster text searches
CREATE INDEX IF NOT EXISTS idx_expense_transaction_description
ON "ExpenseTransaction" USING gin(to_tsvector('english', description));

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ExpenseTransaction'
ORDER BY ordinal_position;
