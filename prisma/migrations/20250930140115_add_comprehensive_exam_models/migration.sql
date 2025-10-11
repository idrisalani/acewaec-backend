-- CreateEnum
CREATE TYPE "public"."ComprehensiveExamStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."comprehensive_exams" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "status" "public"."ComprehensiveExamStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "studentCategory" "public"."StudentCategory" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comprehensive_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subject_results" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "score" DECIMAL(65,30) NOT NULL,
    "grade" TEXT NOT NULL,
    "timeTaken" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answers" JSONB NOT NULL,

    CONSTRAINT "subject_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subject_results_examId_subjectId_key" ON "public"."subject_results"("examId", "subjectId");

-- AddForeignKey
ALTER TABLE "public"."comprehensive_exams" ADD CONSTRAINT "comprehensive_exams_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subject_results" ADD CONSTRAINT "subject_results_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."comprehensive_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subject_results" ADD CONSTRAINT "subject_results_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
