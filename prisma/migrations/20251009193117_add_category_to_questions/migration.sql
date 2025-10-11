-- AlterTable
ALTER TABLE "public"."practice_sessions" ALTER COLUMN "status" SET DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE "public"."questions" ADD COLUMN     "category" "public"."StudentCategory" NOT NULL DEFAULT 'SCIENCE';

-- CreateIndex
CREATE INDEX "questions_category_idx" ON "public"."questions"("category");

-- CreateIndex
CREATE INDEX "questions_subjectId_idx" ON "public"."questions"("subjectId");

-- CreateIndex
CREATE INDEX "questions_topicId_idx" ON "public"."questions"("topicId");
