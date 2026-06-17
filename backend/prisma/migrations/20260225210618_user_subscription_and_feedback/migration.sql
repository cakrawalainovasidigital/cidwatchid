-- AlterTable: Tambahkan kolom subscription pada users
ALTER TABLE "users" ADD COLUMN "is_free" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "subscription_type" TEXT;
ALTER TABLE "users" ADD COLUMN "subscription_start" DATETIME;
ALTER TABLE "users" ADD COLUMN "subscription_end" DATETIME;

-- CreateTable: UserFeedback
CREATE TABLE "user_feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "rating" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "admin_reply" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" DATETIME,
    CONSTRAINT "user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "user_feedback_user_id_idx" ON "user_feedback"("user_id");
CREATE INDEX "user_feedback_status_idx" ON "user_feedback"("status");
CREATE INDEX "user_feedback_created_at_idx" ON "user_feedback"("created_at");
