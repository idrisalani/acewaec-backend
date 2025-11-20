-- AlterTable
ALTER TABLE "public"."questions" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];