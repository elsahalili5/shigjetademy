-- DropIndex
DROP INDEX "AttendanceRecord_group_id_date_idx";

-- DropIndex
DROP INDEX "AttendanceRecord_group_id_student_id_date_key";

-- AlterTable: nullable first, so existing rows can be filled in
ALTER TABLE "AttendanceRecord" ADD COLUMN     "start_time" TIME(0);

-- Backfill: each existing mark joins its group's first session on that weekday; a day with no session keeps 00:00 and stays readable
UPDATE "AttendanceRecord" AS record
SET "start_time" = COALESCE(
  (
    SELECT MIN(meeting."start_time")
    FROM "GroupMeeting" AS meeting
    WHERE meeting."group_id" = record."group_id"
      AND meeting."weekday" = (ARRAY['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']::"Weekday"[])[EXTRACT(ISODOW FROM record."date")::int]
  ),
  TIME '00:00'
);

ALTER TABLE "AttendanceRecord" ALTER COLUMN "start_time" SET NOT NULL;

-- CreateIndex
CREATE INDEX "AttendanceRecord_group_id_date_start_time_idx" ON "AttendanceRecord"("group_id", "date", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_group_id_student_id_date_start_time_key" ON "AttendanceRecord"("group_id", "student_id", "date", "start_time");
