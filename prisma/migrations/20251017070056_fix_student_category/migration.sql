-- DropEnum
DROP TYPE "public"."ComprehensiveExamStatus";

-- RenameForeignKey
ALTER TABLE "bookings" RENAME CONSTRAINT "booking_tutor_fkey" TO "booking_tutor_user_fkey";

-- RenameForeignKey
ALTER TABLE "bookings" RENAME CONSTRAINT "bookings_studentId_fkey" TO "booking_student_fkey";
