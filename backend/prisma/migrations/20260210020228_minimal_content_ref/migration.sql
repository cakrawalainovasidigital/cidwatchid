/*
  Warnings:

  - Added the required column `provider_key` to the `content_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source_id` to the `content_items` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_content_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category_id" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "title" TEXT,
    "synopsis" TEXT,
    "cover_url" TEXT,
    "release_date" TEXT,
    "rating" TEXT,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "content_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_content_items" ("category_id", "cover_url", "created_at", "id", "is_active", "rating", "release_date", "synopsis", "title", "updated_at") SELECT "category_id", "cover_url", "created_at", "id", "is_active", "rating", "release_date", "synopsis", "title", "updated_at" FROM "content_items";
DROP TABLE "content_items";
ALTER TABLE "new_content_items" RENAME TO "content_items";
CREATE INDEX "content_items_category_id_idx" ON "content_items"("category_id");
CREATE INDEX "content_items_title_idx" ON "content_items"("title");
CREATE UNIQUE INDEX "content_items_provider_key_source_id_key" ON "content_items"("provider_key", "source_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
