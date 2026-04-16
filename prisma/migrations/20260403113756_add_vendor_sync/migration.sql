-- AlterTable
ALTER TABLE "Order" ADD COLUMN "vendorLastSynced" DATETIME;
ALTER TABLE "Order" ADD COLUMN "vendorOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN "vendorPlatform" TEXT;
ALTER TABLE "Order" ADD COLUMN "vendorSyncData" TEXT;
