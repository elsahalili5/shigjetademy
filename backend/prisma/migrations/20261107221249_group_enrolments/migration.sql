-- CreateTable
CREATE TABLE "GroupEnrolment" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "enrolled_on" DATE NOT NULL,
    "withdrawn_on" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupEnrolment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupEnrolment_group_id_withdrawn_on_idx" ON "GroupEnrolment"("group_id", "withdrawn_on");

-- CreateIndex
CREATE INDEX "GroupEnrolment_student_id_withdrawn_on_idx" ON "GroupEnrolment"("student_id", "withdrawn_on");

-- AddForeignKey
ALTER TABLE "GroupEnrolment" ADD CONSTRAINT "GroupEnrolment_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupEnrolment" ADD CONSTRAINT "GroupEnrolment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
