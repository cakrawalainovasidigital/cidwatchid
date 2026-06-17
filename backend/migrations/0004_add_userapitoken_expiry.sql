-- Add expiresAt for API tokens
ALTER TABLE "UserApiToken" ADD COLUMN "expiresAt" DATETIME;

-- Backfill existing rows to expire in 1 hour from now
UPDATE "UserApiToken"
SET "expiresAt" = DATETIME('now', '+1 hour')
WHERE "expiresAt" IS NULL;
