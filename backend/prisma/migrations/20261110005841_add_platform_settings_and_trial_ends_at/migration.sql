-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'PLATFORM_SETTINGS_UPDATED';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "trial_ends_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "platform_name" TEXT NOT NULL DEFAULT 'Shigjetademy',
    "logo_url" TEXT,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_message" TEXT,
    "default_trial_days" INTEGER NOT NULL DEFAULT 14,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);
