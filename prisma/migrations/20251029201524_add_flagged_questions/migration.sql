-- CreateTable
CREATE TABLE "flagged_questions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flagged_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flagged_questions_userId_idx" ON "flagged_questions"("userId");

-- CreateIndex
CREATE INDEX "flagged_questions_sessionId_idx" ON "flagged_questions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "flagged_questions_sessionId_userId_questionId_key" ON "flagged_questions"("sessionId", "userId", "questionId");

-- AddForeignKey
ALTER TABLE "flagged_questions" ADD CONSTRAINT "flagged_questions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flagged_questions" ADD CONSTRAINT "flagged_questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flagged_questions" ADD CONSTRAINT "flagged_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
