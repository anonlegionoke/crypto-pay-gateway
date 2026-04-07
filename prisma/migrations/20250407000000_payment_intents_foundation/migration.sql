-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('SIMULATION', 'REAL');

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "mode" "PaymentMode" NOT NULL DEFAULT 'SIMULATION',
ADD COLUMN "paymentAddress" TEXT,
ADD COLUMN "quoteAmountUSDC" DECIMAL(65,30),
ADD COLUMN "signature" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill paymentAddress from legacy data
UPDATE "Payment"
SET "paymentAddress" = "fromWallet"
WHERE "paymentAddress" IS NULL;

-- AlterTable
ALTER TABLE "Payment"
ALTER COLUMN "fromWallet" DROP NOT NULL,
ALTER COLUMN "paymentAddress" SET NOT NULL,
ALTER COLUMN "status" TYPE "PaymentStatus" USING "status"::"PaymentStatus",
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Payment_signature_key" ON "Payment"("signature");

-- CreateIndex
CREATE INDEX "Payment_merchantId_status_createdAt_idx" ON "Payment"("merchantId", "status", "createdAt");
