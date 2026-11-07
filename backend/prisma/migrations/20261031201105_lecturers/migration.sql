-- CreateEnum
CREATE TYPE "LecturerStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'LECTURER_ADDED';
ALTER TYPE "ActivityAction" ADD VALUE 'LECTURER_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'LECTURER_ARCHIVED';
ALTER TYPE "ActivityAction" ADD VALUE 'LECTURER_RESTORED';

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "lecturer_id" UUID;

-- CreateTable
CREATE TABLE "Lecturer" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "subjects" TEXT[],
    "employment_type" "EmploymentType" NOT NULL,
    "started_on" DATE,
    "notes" TEXT,
    "department_id" UUID,
    "status" "LecturerStatus" NOT NULL DEFAULT 'ACTIVE',
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lecturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturerLocation" (
    "lecturer_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,

    CONSTRAINT "LecturerLocation_pkey" PRIMARY KEY ("lecturer_id","location_id")
);

-- CreateIndex
CREATE INDEX "Lecturer_organization_id_status_idx" ON "Lecturer"("organization_id", "status");

-- CreateIndex
CREATE INDEX "Lecturer_organization_id_last_name_idx" ON "Lecturer"("organization_id", "last_name");

-- CreateIndex
CREATE INDEX "Lecturer_department_id_idx" ON "Lecturer"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "Lecturer_organization_id_user_id_key" ON "Lecturer"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "LecturerLocation_location_id_idx" ON "LecturerLocation"("location_id");

-- CreateIndex
CREATE INDEX "Invitation_lecturer_id_idx" ON "Invitation"("lecturer_id");

-- AddForeignKey
ALTER TABLE "Lecturer" ADD CONSTRAINT "Lecturer_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lecturer" ADD CONSTRAINT "Lecturer_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lecturer" ADD CONSTRAINT "Lecturer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerLocation" ADD CONSTRAINT "LecturerLocation_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerLocation" ADD CONSTRAINT "LecturerLocation_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
