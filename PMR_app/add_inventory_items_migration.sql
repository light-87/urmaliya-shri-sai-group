-- ============================================================================
-- Migration: Add New Inventory Items
-- Date: 2025-12-17
-- Description: Adds new bucket types and inventory items to the system
--
-- New Items:
-- 1. CUMMINS_20L - Cummins 20L bucket (affects FREE_DEF: 20L)
-- 2. OTHER_20L - Other 20L bucket (affects FREE_DEF: 20L)
-- 3. OTHER_ITEMS - Other Items (no FREE_DEF impact: 0L)
-- 4. PP_FILTER - P.P. Filter (no FREE_DEF impact: 0L)
-- 5. WOUND_FILTER - Wound Filter (no FREE_DEF impact: 0L)
-- 6. BAG_FILTER - Bag Filter (no FREE_DEF impact: 0L)
-- 7. UF_FILTER - UF Filter (no FREE_DEF impact: 0L)
-- 8. CHEMICAL_POWDER - Chemical Powder (no FREE_DEF impact: 0L)
-- 9. JUMBO_5_MICRON - Jumbo 5 Micron (no FREE_DEF impact: 0L)
-- 10. CARTRIDGE_FILTER_022 - 0.22 Cartridge Filter (no FREE_DEF impact: 0L)
-- 11. DISPENSER - Dispenser (no FREE_DEF impact: 0L)
-- 12. FLOW_METER - Flow Meter (no FREE_DEF impact: 0L)
-- 13. IBC_ADAPTOR - IBC Adaptor (no FREE_DEF impact: 0L)
-- 14. NOZZLE - Nozzle (no FREE_DEF impact: 0L)
-- ============================================================================

BEGIN;

-- Step 1: Drop the existing bucket type constraint
ALTER TABLE "InventoryTransaction"
DROP CONSTRAINT IF EXISTS valid_bucket_type;

-- Step 2: Add the new constraint with all bucket types (existing + new)
ALTER TABLE "InventoryTransaction"
ADD CONSTRAINT valid_bucket_type CHECK ("bucketType" IN (
  -- Existing bucket types
  'TATA_G', 'TATA_W', 'TATA_HP', 'AL_10_LTR', 'AL', 'BB', 'ES',
  'MH', 'MH_10_LTR', 'TATA_10_LTR', 'IBC_TANK', 'ECO', 'INDIAN_OIL_20L', 'FREE_DEF',

  -- New bucket types (20L buckets that affect FREE_DEF)
  'CUMMINS_20L', 'OTHER_20L',

  -- New inventory items (accessories/filters - no FREE_DEF impact)
  'OTHER_ITEMS', 'PP_FILTER', 'WOUND_FILTER', 'BAG_FILTER', 'UF_FILTER', 'CHEMICAL_POWDER',
  'JUMBO_5_MICRON', 'CARTRIDGE_FILTER_022', 'DISPENSER', 'FLOW_METER',
  'IBC_ADAPTOR', 'NOZZLE'
));

COMMIT;

-- Verification queries (optional - run these to verify the migration)
-- ============================================================================

-- Check the constraint was updated successfully
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = '"InventoryTransaction"'::regclass
AND conname = 'valid_bucket_type';

-- Show current inventory counts by bucket type
SELECT "bucketType", COUNT(*) as transaction_count
FROM "InventoryTransaction"
GROUP BY "bucketType"
ORDER BY transaction_count DESC;

-- ============================================================================
-- NOTES:
-- ============================================================================
--
-- After running this migration:
-- 1. Update your application code to include the new BucketType enum values
-- 2. Update BUCKET_TYPE_LABELS mapping with display names
-- 3. Update BUCKET_SIZES mapping (20L for buckets, 0L for accessories)
--
-- Buckets with 20L will auto-deduct from FREE_DEF when sold
-- Accessories with 0L will NOT affect FREE_DEF stock
-- ============================================================================
