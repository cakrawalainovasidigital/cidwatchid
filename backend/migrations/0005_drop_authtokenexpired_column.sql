-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "subcriptionStart" DATETIME,
    "subcriptionExpired" DATETIME,
    "paymentMethod" TEXT,
    "paymentStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Users" ("createdAt", "email", "id", "isFree", "password", "paymentMethod", "paymentStatus", "subcriptionExpired", "subcriptionStart", "updatedAt", "username") SELECT "createdAt", "email", "id", "isFree", "password", "paymentMethod", "paymentStatus", "subcriptionExpired", "subcriptionStart", "updatedAt", "username" FROM "Users";
DROP TABLE "Users";
ALTER TABLE "new_Users" RENAME TO "Users";
CREATE UNIQUE INDEX "Users_username_key" ON "Users"("username");
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
