/*
  Warnings:

  - You are about to drop the column `expiryDate` on the `comprehensive_exams` table. All the data in the column will be lost.
  - You are about to drop the column `studentCategory` on the `comprehensive_exams` table. All the data in the column will be lost.
  - You are about to drop the column `studentName` on the `comprehensive_exams` table. All the data in the column will be lost.
  - The `status` column on the `comprehensive_exams` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."ExamStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "public"."DayStatus" AS ENUM ('LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'MISSED');

-- AlterTable
ALTER TABLE "public"."comprehensive_exams" DROP COLUMN "expiryDate",
DROP COLUMN "studentCategory",
DROP COLUMN "studentName",
ADD COLUMN     "certificateIssued" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "certificateUrl" TEXT,
ADD COLUMN     "correctAnswers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "durationPerDay" INTEGER NOT NULL DEFAULT 180,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'WAEC Mock Examination',
ADD COLUMN     "overallScore" DECIMAL(65,30),
ADD COLUMN     "questionsPerSubject" INTEGER NOT NULL DEFAULT 40,
ADD COLUMN     "subjects" TEXT[],
ADD COLUMN     "totalDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "totalQuestions" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."ExamStatus" NOT NULL DEFAULT 'NOT_STARTED',
ALTER COLUMN "startDate" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."exam_days" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" "public"."DayStatus" NOT NULL DEFAULT 'LOCKED',
    "sessionId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "score" DECIMAL(65,30),

    CONSTRAINT "exam_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_days_sessionId_key" ON "public"."exam_days"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_days_examId_dayNumber_key" ON "public"."exam_days"("examId", "dayNumber");

-- AddForeignKey
ALTER TABLE "public"."exam_days" ADD CONSTRAINT "exam_days_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."comprehensive_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_days" ADD CONSTRAINT "exam_days_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_days" ADD CONSTRAINT "exam_days_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."practice_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
