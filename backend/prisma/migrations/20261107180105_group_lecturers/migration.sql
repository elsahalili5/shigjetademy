-- CreateTable
CREATE TABLE "GroupLecturerAssignment" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "lecturer_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupLecturerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupLecturerAssignment_group_id_start_date_idx" ON "GroupLecturerAssignment"("group_id", "start_date");

-- CreateIndex
CREATE INDEX "GroupLecturerAssignment_lecturer_id_idx" ON "GroupLecturerAssignment"("lecturer_id");

-- AddForeignKey
ALTER TABLE "GroupLecturerAssignment" ADD CONSTRAINT "GroupLecturerAssignment_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupLecturerAssignment" ADD CONSTRAINT "GroupLecturerAssignment_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
