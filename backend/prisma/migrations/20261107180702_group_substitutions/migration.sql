-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'GROUP_SUBSTITUTION_ADDED';
ALTER TYPE "ActivityAction" ADD VALUE 'GROUP_SUBSTITUTION_UPDATED';
ALTER TYPE "ActivityAction" ADD VALUE 'GROUP_SUBSTITUTION_CANCELLED';

-- CreateTable
CREATE TABLE "GroupSubstitution" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "lecturer_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "note" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupSubstitution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupSubstitution_group_id_start_date_idx" ON "GroupSubstitution"("group_id", "start_date");

-- CreateIndex
CREATE INDEX "GroupSubstitution_lecturer_id_end_date_idx" ON "GroupSubstitution"("lecturer_id", "end_date");

-- AddForeignKey
ALTER TABLE "GroupSubstitution" ADD CONSTRAINT "GroupSubstitution_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSubstitution" ADD CONSTRAINT "GroupSubstitution_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "Lecturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
