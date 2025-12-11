-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'NEED_TO_CALL', 'CALLED', 'GOT_RESPONSE', 'ON_HOLD', 'CALL_IN_7_DAYS', 'CONVERTED', 'NOT_INTERESTED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('NO_ANSWER', 'BUSY', 'INTERESTED', 'NEED_INFO', 'CALL_BACK_LATER', 'WRONG_NUMBER', 'NOT_INTERESTED_NOW');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "company" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "lastCallDate" TIMESTAMP(3),
    "nextFollowUpDate" TIMESTAMP(3),
    "callOutcome" "CallOutcome",
    "quickNote" TEXT,
    "additionalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_priority_idx" ON "Lead"("priority");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUpDate_idx" ON "Lead"("nextFollowUpDate");

-- CreateIndex
CREATE INDEX "Lead_lastCallDate_idx" ON "Lead"("lastCallDate");
