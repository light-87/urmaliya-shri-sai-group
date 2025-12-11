-- CreateEnum
CREATE TYPE "PinRole" AS ENUM ('ADMIN', 'EXPENSE_INVENTORY', 'INVENTORY_ONLY');

-- CreateEnum
CREATE TYPE "Warehouse" AS ENUM ('PI', 'VVN');

-- CreateEnum
CREATE TYPE "BucketType" AS ENUM ('A_GRADE_70KG', 'B_GRADE_70KG', 'C_GRADE_70KG', 'A_GRADE_50KG', 'B_GRADE_50KG', 'C_GRADE_50KG', 'A_GRADE_15KG', 'B_GRADE_15KG', 'C_GRADE_15KG', 'DEFORMED_15KG');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "ExpenseAccount" AS ENUM ('ICICI', 'HDFC', 'CASH');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "Pin" (
    "id" TEXT NOT NULL,
    "pinNumber" TEXT NOT NULL,
    "role" "PinRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "warehouse" "Warehouse" NOT NULL,
    "bucketType" "BucketType" NOT NULL,
    "action" "ActionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "buyerSeller" TEXT NOT NULL,
    "runningTotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "account" "ExpenseAccount" NOT NULL,
    "type" "TransactionType" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pin_pinNumber_key" ON "Pin"("pinNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Pin_role_key" ON "Pin"("role");

-- CreateIndex
CREATE INDEX "Pin_pinNumber_idx" ON "Pin"("pinNumber");

-- CreateIndex
CREATE INDEX "InventoryTransaction_date_idx" ON "InventoryTransaction"("date");

-- CreateIndex
CREATE INDEX "InventoryTransaction_warehouse_bucketType_idx" ON "InventoryTransaction"("warehouse", "bucketType");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_date_idx" ON "ExpenseTransaction"("date");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_name_idx" ON "ExpenseTransaction"("name");

-- CreateIndex
CREATE INDEX "ExpenseTransaction_account_idx" ON "ExpenseTransaction"("account");

-- Insert default PINs
INSERT INTO "Pin" ("id", "pinNumber", "role", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, '1234', 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '2345', 'EXPENSE_INVENTORY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '3456', 'INVENTORY_ONLY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
