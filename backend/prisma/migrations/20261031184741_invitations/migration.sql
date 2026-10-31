-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'INVITATION_SENT';
ALTER TYPE "ActivityAction" ADD VALUE 'INVITATION_RESENT';
ALTER TYPE "ActivityAction" ADD VALUE 'INVITATION_REVOKED';
ALTER TYPE "ActivityAction" ADD VALUE 'INVITATION_ACCEPTED';

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "student_id" UUID;

-- CreateIndex
CREATE INDEX "Invitation_student_id_idx" ON "Invitation"("student_id");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
