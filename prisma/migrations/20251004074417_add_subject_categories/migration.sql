-- AlterTable
ALTER TABLE "public"."subjects" ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
