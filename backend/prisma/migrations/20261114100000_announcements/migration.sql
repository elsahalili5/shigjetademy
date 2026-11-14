-- CreateEnum
CREATE TYPE "AnnouncementAudienceKind" AS ENUM ('SCHOOL', 'ROLE', 'COURSE', 'GROUP');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Announcement" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "author_membership_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience_kind" "AnnouncementAudienceKind" NOT NULL,
    "audience_role" "MemberRole",
    "course_id" UUID,
    "group_id" UUID,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "publish_at" TIMESTAMP(3),
    "edited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "announcement_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("announcement_id","membership_id")
);

-- CreateIndex
CREATE INDEX "Announcement_organization_id_status_publish_at_idx" ON "Announcement"("organization_id", "status", "publish_at");

-- CreateIndex
CREATE INDEX "Announcement_author_membership_id_idx" ON "Announcement"("author_membership_id");

-- CreateIndex
CREATE INDEX "Announcement_course_id_idx" ON "Announcement"("course_id");

-- CreateIndex
CREATE INDEX "Announcement_group_id_idx" ON "Announcement"("group_id");

-- CreateIndex
CREATE INDEX "AnnouncementRead_membership_id_idx" ON "AnnouncementRead"("membership_id");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_author_membership_id_fkey" FOREIGN KEY ("author_membership_id") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

