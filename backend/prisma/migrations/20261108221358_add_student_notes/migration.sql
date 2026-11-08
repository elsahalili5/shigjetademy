-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'STUDENT_NOTE_ADDED';

-- CreateTable
CREATE TABLE "StudentNote" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "lecturer_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentNote_student_id_created_at_idx" ON "StudentNote"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "StudentNote_group_id_idx" ON "StudentNote"("group_id");

-- CreateIndex
CREATE INDEX "StudentNote_lecturer_id_idx" ON "StudentNote"("lecturer_id");

-- AddForeignKey
ALTER TABLE "StudentNote" ADD CONSTRAINT "StudentNote_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNote" ADD CONSTRAINT "StudentNote_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNote" ADD CONSTRAINT "StudentNote_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
