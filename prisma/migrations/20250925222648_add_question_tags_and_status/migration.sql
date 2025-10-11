-- AlterTable
ALTER TABLE "public"."questions" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
