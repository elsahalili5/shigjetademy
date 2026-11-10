-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'GUARDIAN_ADDED';
ALTER TYPE "ActivityAction" ADD VALUE 'GUARDIAN_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'GUARDIAN_LINKED';
ALTER TYPE "ActivityAction" ADD VALUE 'GUARDIAN_UNLINKED';

-- CreateEnum
CREATE TYPE "GuardianRelationship" AS ENUM ('MOTHER', 'FATHER', 'LEGAL_GUARDIAN', 'GRANDPARENT', 'OTHER');

-- CreateTable
CREATE TABLE "Guardian" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGuardian" (
    "student_id" UUID NOT NULL,
    "guardian_id" UUID NOT NULL,
    "relationship" "GuardianRelationship" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentGuardian_pkey" PRIMARY KEY ("student_id","guardian_id")
);

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN "guardian_id" UUID;

-- CreateIndex
CREATE INDEX "Guardian_organization_id_last_name_idx" ON "Guardian"("organization_id", "last_name");

-- CreateIndex: Postgres treats nulls as distinct, so guardians without an email don't clash
CREATE UNIQUE INDEX "Guardian_organization_id_email_key" ON "Guardian"("organization_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_organization_id_user_id_key" ON "Guardian"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "StudentGuardian_guardian_id_idx" ON "StudentGuardian"("guardian_id");

-- CreateIndex
CREATE INDEX "Invitation_guardian_id_idx" ON "Invitation"("guardian_id");

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
