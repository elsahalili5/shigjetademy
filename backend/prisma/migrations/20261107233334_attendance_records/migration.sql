-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'TARDY', 'ABSENT');

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'ATTENDANCE_CORRECTED';

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "marked_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceRecord_group_id_date_idx" ON "AttendanceRecord"("group_id", "date");

-- CreateIndex
CREATE INDEX "AttendanceRecord_student_id_idx" ON "AttendanceRecord"("student_id");

-- CreateIndex
CREATE INDEX "AttendanceRecord_marked_by_id_idx" ON "AttendanceRecord"("marked_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_group_id_student_id_date_key" ON "AttendanceRecord"("group_id", "student_id", "date");

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_marked_by_id_fkey" FOREIGN KEY ("marked_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
