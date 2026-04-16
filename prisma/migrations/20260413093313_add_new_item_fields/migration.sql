-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "itemCategory" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "quantityReceived" INTEGER,
    "unitPrice" REAL,
    "totalPrice" REAL,
    "purchaseLink" TEXT,
    "lineNumber" TEXT,
    "goodType" TEXT NOT NULL DEFAULT 'GOODS',
    "requisitionNumber" TEXT,
    "expectedDeliveryDate" DATETIME,
    "receivedDate" DATETIME,
    "storedDate" DATETIME,
    "assetTaggingDate" DATETIME,
    "itConfigDate" DATETIME,
    "handoverDate" DATETIME,
    "customClearanceDate" DATETIME,
    "requiresAssetTagging" BOOLEAN NOT NULL DEFAULT false,
    "requiresITConfig" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING_DELIVERY',
    "financeRemarks" TEXT,
    "finalRemarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("assetTaggingDate", "createdAt", "description", "expectedDeliveryDate", "finalRemarks", "financeRemarks", "handoverDate", "id", "itConfigDate", "itemCategory", "orderId", "purchaseLink", "quantity", "receivedDate", "requiresAssetTagging", "requiresITConfig", "status", "storedDate", "totalPrice", "unitPrice", "updatedAt") SELECT "assetTaggingDate", "createdAt", "description", "expectedDeliveryDate", "finalRemarks", "financeRemarks", "handoverDate", "id", "itConfigDate", "itemCategory", "orderId", "purchaseLink", "quantity", "receivedDate", "requiresAssetTagging", "requiresITConfig", "status", "storedDate", "totalPrice", "unitPrice", "updatedAt" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
