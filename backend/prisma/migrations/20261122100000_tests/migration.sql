-- CreateTable
CREATE TABLE "Test" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "author_membership_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "held_at" TIMESTAMP(3) NOT NULL,
    "max_points" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "test_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "points" INTEGER,
    "is_absent" BOOLEAN NOT NULL DEFAULT false,
    "feedback" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "recorded_by_membership_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Test_organization_id_group_id_held_at_idx" ON "Test"("organization_id", "group_id", "held_at");

-- CreateIndex
CREATE INDEX "Test_group_id_idx" ON "Test"("group_id");

-- CreateIndex
CREATE INDEX "Test_author_membership_id_idx" ON "Test"("author_membership_id");

-- CreateIndex
CREATE INDEX "TestResult_organization_id_idx" ON "TestResult"("organization_id");

-- CreateIndex
CREATE INDEX "TestResult_student_id_idx" ON "TestResult"("student_id");

-- CreateIndex
CREATE INDEX "TestResult_recorded_by_membership_id_idx" ON "TestResult"("recorded_by_membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "TestResult_test_id_student_id_key" ON "TestResult"("test_id", "student_id");

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_author_membership_id_fkey" FOREIGN KEY ("author_membership_id") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_recorded_by_membership_id_fkey" FOREIGN KEY ("recorded_by_membership_id") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

