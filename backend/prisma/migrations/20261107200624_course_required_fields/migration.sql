-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_department_id_fkey";

-- AlterTable
ALTER TABLE "Course" ALTER COLUMN "level" SET NOT NULL,
ALTER COLUMN "department_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
