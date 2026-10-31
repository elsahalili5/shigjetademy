-- CreateEnum
CREATE TYPE "WeekStart" AS ENUM ('MONDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "DateFormat" AS ENUM ('DAY_MONTH_YEAR', 'MONTH_DAY_YEAR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'ORGANIZATION_SETTINGS_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'OWNERSHIP_TRANSFERRED';
ALTER TYPE "ActivityAction" ADD VALUE 'ORGANIZATION_DEACTIVATED_BY_OWNER';
ALTER TYPE "ActivityAction" ADD VALUE 'ORGANIZATION_REACTIVATED_BY_OWNER';

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "organization_id" UUID NOT NULL,
    "time_zone" TEXT NOT NULL,
    "week_start" "WeekStart" NOT NULL DEFAULT 'MONDAY',
    "date_format" "DateFormat" NOT NULL DEFAULT 'DAY_MONTH_YEAR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("organization_id")
);

-- AddForeignKey
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

