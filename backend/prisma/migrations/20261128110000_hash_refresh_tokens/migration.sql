-- Data migration: refresh tokens are stored as a SHA-256 hex digest, so a database leak holds no usable token.
-- The regex guard makes it idempotent: a digest is never hashed again, and a JWT always contains dots so it never matches.
-- Clients keep their raw token; the service hashes it on every lookup.
UPDATE "RefreshTokens" SET "token" = encode(sha256(convert_to("token", 'UTF8')), 'hex') WHERE "token" !~ '^[0-9a-f]{64}$';

-- CreateIndex: for deleting expired rows on login
CREATE INDEX IF NOT EXISTS "RefreshTokens_expires_idx" ON "RefreshTokens"("expires");
