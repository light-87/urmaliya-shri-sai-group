#!/bin/bash

# ============================================================================
# Script to run the camelCase updatedAt trigger fix
# ============================================================================

set -e  # Exit on error

echo "🔧 Fixing updatedAt trigger for transaction tables..."
echo ""

# Check if POSTGRES_URL_NON_POOLING is set
if [ -z "$POSTGRES_URL_NON_POOLING" ]; then
  echo "❌ Error: POSTGRES_URL_NON_POOLING environment variable is not set"
  echo ""
  echo "Please set it first:"
  echo "  export POSTGRES_URL_NON_POOLING='your-database-url'"
  echo ""
  echo "Or run with:"
  echo "  POSTGRES_URL_NON_POOLING='your-url' ./migrations/run_fix.sh"
  exit 1
fi

# Run the migration
echo "📝 Running migration: fix_camelcase_updated_at_trigger.sql"
psql "$POSTGRES_URL_NON_POOLING" -f "$(dirname "$0")/fix_camelcase_updated_at_trigger.sql"

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "Verifying triggers..."
psql "$POSTGRES_URL_NON_POOLING" -c "
  SELECT
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    proname AS function_name
  FROM pg_trigger
  JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
  WHERE tgname LIKE '%updated_at%'
  ORDER BY table_name;
"

echo ""
echo "✅ All done! Transaction updates should now work correctly."
