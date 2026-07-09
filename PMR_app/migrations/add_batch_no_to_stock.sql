-- Migration to add batchNo column to StockTransaction table

ALTER TABLE "StockTransaction"
ADD COLUMN IF NOT EXISTS "batchNo" VARCHAR(100);

COMMENT ON COLUMN "StockTransaction"."batchNo" IS 'Batch number for production and urea additions';
