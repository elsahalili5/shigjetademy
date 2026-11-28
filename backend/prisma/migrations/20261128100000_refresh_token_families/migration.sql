-- AlterTable: additive only. The defaults keep code from before this change working, because it inserts rows without these columns.
ALTER TABLE "RefreshTokens"
  ADD COLUMN "family_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN "session_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "revoked_at" TIMESTAMP(3);

-- Existing rows: each one becomes its own family, and its session started when it was created.
-- Rows that were already revoked keep revoked_at NULL, which reads as "revoked long ago".
UPDATE "RefreshTokens" SET "family_id" = "id", "session_started_at" = "created";

-- CreateIndex
CREATE INDEX "RefreshTokens_family_id_idx" ON "RefreshTokens"("family_id");
