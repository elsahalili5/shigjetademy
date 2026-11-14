-- CreateEnum
CREATE TYPE "DiscussionSpaceKind" AS ENUM ('GROUP', 'COURSE');

-- CreateEnum
CREATE TYPE "DiscussionStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "DiscussionRemovedBy" AS ENUM ('AUTHOR', 'MODERATOR');

-- CreateTable
CREATE TABLE "DiscussionTopic" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "space_kind" "DiscussionSpaceKind" NOT NULL,
    "group_id" UUID,
    "course_id" UUID,
    "author_membership_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "status" "DiscussionStatus" NOT NULL DEFAULT 'ACTIVE',
    "removed_by" "DiscussionRemovedBy",
    "edited_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscussionTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionReply" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "author_membership_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "status" "DiscussionStatus" NOT NULL DEFAULT 'ACTIVE',
    "removed_by" "DiscussionRemovedBy",
    "edited_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscussionReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionRead" (
    "topic_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "last_read_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscussionRead_pkey" PRIMARY KEY ("topic_id","membership_id")
);

-- CreateIndex
CREATE INDEX "DiscussionTopic_organization_id_last_activity_at_idx" ON "DiscussionTopic"("organization_id", "last_activity_at");

-- CreateIndex
CREATE INDEX "DiscussionTopic_group_id_idx" ON "DiscussionTopic"("group_id");

-- CreateIndex
CREATE INDEX "DiscussionTopic_course_id_idx" ON "DiscussionTopic"("course_id");

-- CreateIndex
CREATE INDEX "DiscussionTopic_author_membership_id_idx" ON "DiscussionTopic"("author_membership_id");

-- CreateIndex
CREATE INDEX "DiscussionReply_topic_id_created_at_idx" ON "DiscussionReply"("topic_id", "created_at");

-- CreateIndex
CREATE INDEX "DiscussionReply_author_membership_id_idx" ON "DiscussionReply"("author_membership_id");

-- CreateIndex
CREATE INDEX "DiscussionRead_membership_id_idx" ON "DiscussionRead"("membership_id");

-- AddForeignKey
ALTER TABLE "DiscussionTopic" ADD CONSTRAINT "DiscussionTopic_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionTopic" ADD CONSTRAINT "DiscussionTopic_author_membership_id_fkey" FOREIGN KEY ("author_membership_id") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionTopic" ADD CONSTRAINT "DiscussionTopic_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionTopic" ADD CONSTRAINT "DiscussionTopic_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionReply" ADD CONSTRAINT "DiscussionReply_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "DiscussionTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionReply" ADD CONSTRAINT "DiscussionReply_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionReply" ADD CONSTRAINT "DiscussionReply_author_membership_id_fkey" FOREIGN KEY ("author_membership_id") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionRead" ADD CONSTRAINT "DiscussionRead_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "DiscussionTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionRead" ADD CONSTRAINT "DiscussionRead_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

