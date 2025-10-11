/*
  Warnings:

  - You are about to drop the `practice_answers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."practice_answers" DROP CONSTRAINT "practice_answers_questionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."practice_answers" DROP CONSTRAINT "practice_answers_sessionId_fkey";

-- DropTable
DROP TABLE "public"."practice_answers";

-- CreateTable
CREATE TABLE "public"."PracticeAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedAnswer" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "timeSpent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticeAnswer_sessionId_questionId_key" ON "public"."PracticeAnswer"("sessionId", "questionId");

-- AddForeignKey
ALTER TABLE "public"."PracticeAnswer" ADD CONSTRAINT "PracticeAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PracticeAnswer" ADD CONSTRAINT "PracticeAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
