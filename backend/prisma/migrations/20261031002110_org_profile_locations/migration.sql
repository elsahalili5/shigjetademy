-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'ORGANIZATION_PROFILE_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'LOCATION_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'LOCATION_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'LOCATION_REMOVED';
ALTER TYPE "ActivityAction" ADD VALUE 'DEPARTMENT_CREATED';
ALTER TYPE "ActivityAction" ADD VALUE 'DEPARTMENT_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'DEPARTMENT_REMOVED';

-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "subject_name" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "Location" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "location_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Location_organization_id_idx" ON "Location"("organization_id");

-- CreateIndex
CREATE INDEX "Department_location_id_idx" ON "Department"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "Department_organization_id_name_key" ON "Department"("organization_id", "name");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
