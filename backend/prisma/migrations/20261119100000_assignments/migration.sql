-- CreateTable
CREATE TABLE "Assignment" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "author_membership_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "max_points" INTEGER,
    "file_key" TEXT,
    "file_name" TEXT,
    "file_type" TEXT,
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "text" TEXT,
    "file_key" TEXT,
    "file_name" TEXT,
    "file_type" TEXT,
    "file_size" INTEGER,
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "points" INTEGER,
    "feedback" TEXT,
    "marked_at" TIMESTAMP(3),
    "marked_by_membership_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assignment_organization_id_group_id_due_at_idx" ON "Assignment"("organization_id", "group_id", "due_at");

-- CreateIndex
CREATE INDEX "Assignment_group_id_idx" ON "Assignment"("group_id");

-- CreateIndex
CREATE INDEX "Assignment_author_membership_id_idx" ON "Assignment"("author_membership_id");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_organization_id_idx" ON "AssignmentSubmission"("organization_id");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_student_id_idx" ON "AssignmentSubmission"("student_id");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_marked_by_membership_id_idx" ON "AssignmentSubmission"("marked_by_membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_assignment_id_student_id_key" ON "AssignmentSubmission"("assignment_id", "student_id");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_author_membership_id_fkey" FOREIGN KEY ("author_membership_id") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_marked_by_membership_id_fkey" FOREIGN KEY ("marked_by_membership_id") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

