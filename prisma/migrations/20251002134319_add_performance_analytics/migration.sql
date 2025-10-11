-- CreateTable
CREATE TABLE "public"."performance_analytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "topicId" TEXT,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "wrongAnswers" INTEGER NOT NULL DEFAULT 0,
    "accuracyRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "averageTimePerQ" INTEGER NOT NULL DEFAULT 0,
    "easyCorrect" INTEGER NOT NULL DEFAULT 0,
    "easyTotal" INTEGER NOT NULL DEFAULT 0,
    "mediumCorrect" INTEGER NOT NULL DEFAULT 0,
    "mediumTotal" INTEGER NOT NULL DEFAULT 0,
    "hardCorrect" INTEGER NOT NULL DEFAULT 0,
    "hardTotal" INTEGER NOT NULL DEFAULT 0,
    "lastPracticed" TIMESTAMP(3),
    "totalStudyTime" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "performance_analytics_userId_subjectId_topicId_key" ON "public"."performance_analytics"("userId", "subjectId", "topicId");

-- AddForeignKey
ALTER TABLE "public"."performance_analytics" ADD CONSTRAINT "performance_analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_analytics" ADD CONSTRAINT "performance_analytics_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."performance_analytics" ADD CONSTRAINT "performance_analytics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "public"."topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
