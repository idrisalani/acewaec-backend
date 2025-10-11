-- AlterEnum
ALTER TYPE "public"."SessionStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "public"."practice_sessions" ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "resumedAt" TIMESTAMP(3),
ADD COLUMN     "totalPausedTime" INTEGER NOT NULL DEFAULT 0;
