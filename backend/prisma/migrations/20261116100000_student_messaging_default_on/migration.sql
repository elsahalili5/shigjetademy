-- Student messaging is on unless the owner turns it off.
ALTER TABLE "OrganizationSettings" ALTER COLUMN "student_messaging_enabled" SET DEFAULT true;

-- Existing rows only got false from the default of the ADD COLUMN in the inbox migration; nobody chose it, so nobody can rely on it.
-- This overwrites saved false values too: the settings form always saves every field, so an explicit false cannot be told apart from the old
-- default. That was accepted for the rollout of this feature; an owner who wants it off turns it off again.
UPDATE "OrganizationSettings" SET "student_messaging_enabled" = true;
