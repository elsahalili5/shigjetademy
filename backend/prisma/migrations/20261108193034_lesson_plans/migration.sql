-- CreateTable
CREATE TABLE "LessonPlan" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "topic" TEXT,
    "covered" TEXT,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonPlan_group_id_date_start_time_idx" ON "LessonPlan"("group_id", "date", "start_time");

-- CreateIndex
CREATE INDEX "LessonPlan_updated_by_id_idx" ON "LessonPlan"("updated_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "LessonPlan_group_id_date_start_time_key" ON "LessonPlan"("group_id", "date", "start_time");

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
