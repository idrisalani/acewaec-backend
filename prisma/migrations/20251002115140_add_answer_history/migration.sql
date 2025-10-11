-- CreateTable
CREATE TABLE "public"."answer_history" (
    "id" TEXT NOT NULL,
    "practiceAnswerId" TEXT NOT NULL,
    "previousAnswer" TEXT NOT NULL,
    "newAnswer" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."answer_history" ADD CONSTRAINT "answer_history_practiceAnswerId_fkey" FOREIGN KEY ("practiceAnswerId") REFERENCES "public"."PracticeAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
