-- AlterEnum
ALTER TYPE "public"."SessionStatus" ADD VALUE 'NOT_STARTED';

-- DropForeignKey
ALTER TABLE "public"."questions" DROP CONSTRAINT "questions_topicId_fkey";

-- AlterTable
ALTER TABLE "public"."questions" ALTER COLUMN "topicId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "public"."topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
