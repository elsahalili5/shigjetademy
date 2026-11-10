-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_location_id_fkey";

-- DropIndex
DROP INDEX "Group_location_id_idx";

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "location_id",
ADD COLUMN     "room_id" UUID;

-- CreateTable
CREATE TABLE "Room" (
    "id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Room_location_id_idx" ON "Room"("location_id");

-- CreateIndex
CREATE INDEX "Group_room_id_idx" ON "Group"("room_id");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
