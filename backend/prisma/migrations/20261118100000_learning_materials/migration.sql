-- CreateEnum
CREATE TYPE "MaterialSpaceKind" AS ENUM ('GROUP', 'COURSE');

-- CreateEnum
CREATE TYPE "MaterialKind" AS ENUM ('FILE', 'LINK', 'NOTE');

-- CreateTable
CREATE TABLE "Material" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "space_kind" "MaterialSpaceKind" NOT NULL,
    "group_id" UUID,
    "course_id" UUID,
    "author_membership_id" UUID NOT NULL,
    "kind" "MaterialKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "section" TEXT,
    "url" TEXT,
    "body" TEXT,
    "file_key" TEXT,
    "file_name" TEXT,
    "file_type" TEXT,
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Material_organization_id_created_at_idx" ON "Material"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "Material_group_id_idx" ON "Material"("group_id");

-- CreateIndex
CREATE INDEX "Material_course_id_idx" ON "Material"("course_id");

-- CreateIndex
CREATE INDEX "Material_author_membership_id_idx" ON "Material"("author_membership_id");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_author_membership_id_fkey" FOREIGN KEY ("author_membership_id") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

