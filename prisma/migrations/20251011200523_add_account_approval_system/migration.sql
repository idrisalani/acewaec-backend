-- CreateEnum
CREATE TYPE "public"."AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."schools" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "accountStatus" "public"."AccountStatus" NOT NULL DEFAULT 'ACTIVE';
