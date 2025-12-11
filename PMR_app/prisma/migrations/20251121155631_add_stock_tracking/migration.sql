-- AlterEnum
ALTER TYPE "BucketType" ADD VALUE 'AP_BLUE';

-- CreateEnum
CREATE TYPE "StockTransactionType" AS ENUM ('ADD_UREA', 'PRODUCE_BATCH', 'SELL_FREE_DEF', 'FILL_BUCKETS', 'SELL_BUCKETS');

-- CreateEnum
CREATE TYPE "StockCategory" AS ENUM ('UREA', 'FREE_DEF', 'FINISHED_GOODS');

-- CreateEnum
CREATE TYPE "StockUnit" AS ENUM ('KG', 'LITERS', 'BAGS');

-- CreateTable
CREATE TABLE "StockTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "StockTransactionType" NOT NULL,
    "category" "StockCategory" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "StockUnit" NOT NULL,
    "description" TEXT,
    "runningTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockTransaction_date_idx" ON "StockTransaction"("date");

-- CreateIndex
CREATE INDEX "StockTransaction_type_idx" ON "StockTransaction"("type");

-- CreateIndex
CREATE INDEX "StockTransaction_category_idx" ON "StockTransaction"("category");
