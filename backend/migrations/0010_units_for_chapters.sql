-- Reshape content_items to minimal fields and allow multiple units per item.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Drop metadata columns from content_items (keep only category/provider/source refs)
CREATE TABLE "new_content_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category_id" TEXT NOT NULL,
    "provider_key" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "content_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_content_items" ("id", "category_id", "provider_key", "source_id", "is_active", "created_at", "updated_at")
SELECT "id", "category_id", "provider_key", "source_id", "is_active", "created_at", "updated_at" FROM "content_items";
DROP TABLE "content_items";
ALTER TABLE "new_content_items" RENAME TO "content_items";
CREATE INDEX "content_items_category_id_idx" ON "content_items"("category_id");
CREATE UNIQUE INDEX "content_items_provider_key_source_id_key" ON "content_items"("provider_key", "source_id");

-- Redefine content_units to support chapters/episodes with composite uniqueness
CREATE TABLE "new_content_units" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content_item_id" TEXT NOT NULL,
    "unit_type" TEXT NOT NULL,
    "season_number" INTEGER,
    "unit_number" INTEGER NOT NULL,
    "title" TEXT,
    "duration_seconds" INTEGER,
    "stream_url" TEXT,
    "published_at" DATETIME,
    CONSTRAINT "content_units_content_item_id_fkey" FOREIGN KEY ("content_item_id") REFERENCES "content_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_content_units" ("id", "content_item_id", "unit_type", "season_number", "unit_number", "title", "duration_seconds", "stream_url", "published_at")
SELECT "id", "content_item_id", "unit_type", "season_number", "unit_number", "title", "duration_seconds", "stream_url", "published_at" FROM "content_units";
DROP TABLE "content_units";
ALTER TABLE "new_content_units" RENAME TO "content_units";
CREATE INDEX "content_units_content_item_id_idx" ON "content_units"("content_item_id");
CREATE UNIQUE INDEX "content_units_content_item_id_unit_type_season_number_unit_number_key" ON "content_units"("content_item_id", "unit_type", "season_number", "unit_number");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
