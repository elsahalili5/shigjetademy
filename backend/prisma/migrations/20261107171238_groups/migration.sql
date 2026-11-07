-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'GROUP_ADDED';
ALTER TYPE "ActivityAction" ADD VALUE 'GROUP_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'GROUP_ARCHIVED';
ALTER TYPE "ActivityAction" ADD VALUE 'GROUP_RESTORED';

-- CreateTable
CREATE TABLE "Group" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "academic_term_id" UUID,
    "location_id" UUID,
    "capacity" INTEGER,
    "status" "GroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Group_organization_id_status_idx" ON "Group"("organization_id", "status");

-- CreateIndex
CREATE INDEX "Group_academic_year_id_idx" ON "Group"("academic_year_id");

-- CreateIndex
CREATE INDEX "Group_academic_term_id_idx" ON "Group"("academic_term_id");

-- CreateIndex
CREATE INDEX "Group_location_id_idx" ON "Group"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "Group_course_id_academic_year_id_name_key" ON "Group"("course_id", "academic_year_id", "name");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "AcademicYear"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "AcademicTerm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
