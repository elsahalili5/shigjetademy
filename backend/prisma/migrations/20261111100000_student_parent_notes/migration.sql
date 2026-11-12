-- CreateTable
CREATE TABLE "StudentParentNote" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "lecturer_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentParentNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentParentNote_student_id_created_at_idx" ON "StudentParentNote"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "StudentParentNote_lecturer_id_created_at_idx" ON "StudentParentNote"("lecturer_id", "created_at");

-- CreateIndex
CREATE INDEX "StudentParentNote_organization_id_idx" ON "StudentParentNote"("organization_id");

-- AddForeignKey
ALTER TABLE "StudentParentNote" ADD CONSTRAINT "StudentParentNote_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentParentNote" ADD CONSTRAINT "StudentParentNote_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentParentNote" ADD CONSTRAINT "StudentParentNote_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
