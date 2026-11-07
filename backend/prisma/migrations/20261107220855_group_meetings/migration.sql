-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "GroupMeeting" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupMeeting_group_id_idx" ON "GroupMeeting"("group_id");

-- AddForeignKey
ALTER TABLE "GroupMeeting" ADD CONSTRAINT "GroupMeeting_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
