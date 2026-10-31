-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'ACADEMIC_YEAR_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'ACADEMIC_YEAR_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'ACADEMIC_YEAR_REMOVED';
ALTER TYPE "ActivityAction" ADD VALUE 'ACADEMIC_TERM_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'ACADEMIC_TERM_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'ACADEMIC_TERM_REMOVED';
ALTER TYPE "ActivityAction" ADD VALUE 'ACADEMIC_HOLIDAY_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'ACADEMIC_HOLIDAY_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'ACADEMIC_HOLIDAY_REMOVED';

-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'MANAGE_ACADEMIC_PERIODS';

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicTerm" (
    "id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicHoliday" (
    "id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicYear_organization_id_idx" ON "AcademicYear"("organization_id");

-- CreateIndex
CREATE INDEX "AcademicTerm_academic_year_id_idx" ON "AcademicTerm"("academic_year_id");

-- CreateIndex
CREATE INDEX "AcademicHoliday_academic_year_id_idx" ON "AcademicHoliday"("academic_year_id");

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicHoliday" ADD CONSTRAINT "AcademicHoliday_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
