-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'LESSON_RESCHEDULED';
ALTER TYPE "ActivityAction" ADD VALUE 'LESSON_RESCHEDULE_CANCELLED';

-- CreateTable
CREATE TABLE "LessonReschedule" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "original_date" DATE NOT NULL,
    "original_start_time" TIME(0) NOT NULL,
    "new_date" DATE NOT NULL,
    "new_start_time" TIME(0) NOT NULL,
    "new_end_time" TIME(0) NOT NULL,
    "reason" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "LessonReschedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonReschedule_group_id_original_date_idx" ON "LessonReschedule"("group_id", "original_date");

-- CreateIndex
CREATE INDEX "LessonReschedule_group_id_new_date_idx" ON "LessonReschedule"("group_id", "new_date");

-- CreateIndex
CREATE INDEX "LessonReschedule_created_by_id_idx" ON "LessonReschedule"("created_by_id");

-- AddForeignKey
ALTER TABLE "LessonReschedule" ADD CONSTRAINT "LessonReschedule_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonReschedule" ADD CONSTRAINT "LessonReschedule_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

