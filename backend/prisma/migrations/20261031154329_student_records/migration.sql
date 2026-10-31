-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'STUDENT_ADDED';
ALTER TYPE "ActivityAction" ADD VALUE 'STUDENT_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'STUDENT_ARCHIVED';
ALTER TYPE "ActivityAction" ADD VALUE 'STUDENT_RESTORED';

-- CreateTable
CREATE TABLE "Student" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "student_number" TEXT NOT NULL,
    "enrolled_on" DATE NOT NULL DEFAULT CURRENT_DATE,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "user_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Student_organization_id_status_idx" ON "Student"("organization_id", "status");

-- CreateIndex
CREATE INDEX "Student_organization_id_last_name_idx" ON "Student"("organization_id", "last_name");

-- CreateIndex
CREATE UNIQUE INDEX "Student_organization_id_student_number_key" ON "Student"("organization_id", "student_number");

-- CreateIndex
CREATE UNIQUE INDEX "Student_organization_id_user_id_key" ON "Student"("organization_id", "user_id");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
