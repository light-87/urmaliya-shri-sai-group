# Database Migrations

This folder contains SQL migration scripts that need to be applied to the database.

## How to Apply Migrations

You need to run these migrations in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the migration SQL
4. Execute the script

## Pending Migrations

### fix_backup_logs_add_missing_counts.sql
**Status**: NEEDS TO BE RUN

This migration adds support for tracking additional table counts in the backup system:
- Adds `registryCount` column for registry_transactions table
- Adds `warehousesCount` column for warehouses table
- Adds `expenseAccountsCount` column for expense_accounts table

**Important**: This migration must be run before the updated backup/restore functionality will work correctly.

## Migration History

- `add_vinay_sachin_accounts.sql` - Added VINAY and SACHIN expense accounts
- `allow_zero_amounts_and_add_accounts.sql` - Allowed zero amounts in transactions
- `fix_backup_logs_add_missing_counts.sql` - Added new count columns to backup_logs (PENDING)
