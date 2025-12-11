-- Enable Row Level Security on all tables
-- This blocks all PostgREST API access while keeping Prisma connections working

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE "Pin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExpenseTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BackupLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE DENY-ALL POLICIES
-- These block all PostgREST API access
-- Prisma connections bypass RLS using the postgres role
-- ============================================

-- Pin table - CRITICAL: Contains authentication credentials
CREATE POLICY "Block all PostgREST access to Pin"
  ON "Pin"
  FOR ALL
  USING (false);

-- InventoryTransaction table
CREATE POLICY "Block all PostgREST access to InventoryTransaction"
  ON "InventoryTransaction"
  FOR ALL
  USING (false);

-- StockTransaction table
CREATE POLICY "Block all PostgREST access to StockTransaction"
  ON "StockTransaction"
  FOR ALL
  USING (false);

-- ExpenseTransaction table - CRITICAL: Contains financial data
CREATE POLICY "Block all PostgREST access to ExpenseTransaction"
  ON "ExpenseTransaction"
  FOR ALL
  USING (false);

-- BackupLog table
CREATE POLICY "Block all PostgREST access to BackupLog"
  ON "BackupLog"
  FOR ALL
  USING (false);

-- SystemSettings table
CREATE POLICY "Block all PostgREST access to SystemSettings"
  ON "SystemSettings"
  FOR ALL
  USING (false);

-- Lead table - CRITICAL: Contains customer/prospect data
CREATE POLICY "Block all PostgREST access to Lead"
  ON "Lead"
  FOR ALL
  USING (false);

-- ============================================
-- SECURITY NOTES
-- ============================================
-- 1. RLS is now ENABLED on all tables
-- 2. PostgREST API requests will be blocked (returns empty results)
-- 3. Prisma connections continue working normally using postgres role
-- 4. No application functionality is affected
-- 5. This closes the security vulnerability where anyone with
--    the Supabase URL and anon key could access all data
