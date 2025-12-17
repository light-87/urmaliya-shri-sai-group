-- Migration: Add missing count columns to backup_logs table
-- This adds support for tracking registry, warehouses, and expense_accounts in backups

-- Add new count columns for missing tables
ALTER TABLE backup_logs
ADD COLUMN IF NOT EXISTS "registryCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "warehousesCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "expenseAccountsCount" INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN backup_logs."registryCount" IS 'Number of registry_transactions records in backup';
COMMENT ON COLUMN backup_logs."warehousesCount" IS 'Number of warehouses records in backup';
COMMENT ON COLUMN backup_logs."expenseAccountsCount" IS 'Number of expense_accounts records in backup';
