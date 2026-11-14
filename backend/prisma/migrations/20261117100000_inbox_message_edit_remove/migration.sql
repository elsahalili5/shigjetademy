-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "edited_at" TIMESTAMP(3),
ADD COLUMN     "status" "MessageStatus" NOT NULL DEFAULT 'ACTIVE';
