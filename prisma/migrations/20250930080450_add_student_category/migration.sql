-- CreateEnum
CREATE TYPE "public"."StudentCategory" AS ENUM ('SCIENCE', 'ART', 'COMMERCIAL');

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "studentCategory" "public"."StudentCategory";
