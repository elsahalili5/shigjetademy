-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'COURSE_ADDED';
ALTER TYPE "ActivityAction" ADD VALUE 'COURSE_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'COURSE_ARCHIVED';
ALTER TYPE "ActivityAction" ADD VALUE 'COURSE_RESTORED';

-- CreateTable
CREATE TABLE "Course" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "level" TEXT,
    "department_id" UUID,
    "status" "CourseStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Course_organization_id_status_idx" ON "Course"("organization_id", "status");

-- CreateIndex
CREATE INDEX "Course_department_id_idx" ON "Course"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "Course_organization_id_name_key" ON "Course"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Course_organization_id_code_key" ON "Course"("organization_id", "code");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
