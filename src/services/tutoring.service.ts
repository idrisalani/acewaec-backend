// backend/src/services/tutoring.service.ts
// Service for managing tutoring marketplace - CORRECTED FOR YOUR SCHEMA ✅

import { TutorProfile, Booking, BookingStatus, SessionType, User, Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateTutorProfileInput {
  bio?: string;
  subjectIds?: string[];        // Changed from specializations → matches schema
  education?: string;            // Added to match schema
  experience?: string;
  hourlyRate: number;
  availableHours?: Record<string, any>; // For JSON storage
}

interface TutorAvailabilityInput {
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

interface BookTutorInput {
  tutorId: string;
  subject: string;
  scheduledAt: Date;        // ✅ Correct field name
  duration: number;
  sessionType: SessionType;
  notes?: string;
}

export class TutoringService {
  /**
   * Create tutor profile
   */
  async createTutorProfile(
    userId: string,
    data: CreateTutorProfileInput
  ): Promise<TutorProfile> {
    return prisma.tutorProfile.create({
      data: {
        user: {
          connect: { id: userId }  // ✅ Use connect for relations
        },
        bio: data.bio || '',
        subjectIds: data.subjectIds || [],           // ✅ Correct field
        education: data.education || '',             // ✅ From schema
        experience: data.experience || '',
        hourlyRate: new Prisma.Decimal(data.hourlyRate),
        availableHours: data.availableHours || {},   // ✅ JSON field
      },
    });
  }

  /**
   * Get tutor profile with all related data
   */
  async getTutorProfile(tutorId: string): Promise<any | null> {
    return prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,    // ✅ Correct field name
            avatar: true,   // ✅ Correct field name
          },
        },
        reviews: {
          include: {
            booking: {
              select: {
                id: true,
                studentId: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get tutor by user ID
   */
  async getTutorByUserId(userId: string): Promise<TutorProfile | null> {
    return prisma.tutorProfile.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });
  }

  /**
   * Update tutor profile
   */
  async updateTutorProfile(
    tutorId: string,
    data: Partial<CreateTutorProfileInput>
  ): Promise<TutorProfile> {
    const updateData: Prisma.TutorProfileUpdateInput = {};

    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.subjectIds !== undefined) updateData.subjectIds = data.subjectIds;  // ✅ Correct
    if (data.education !== undefined) updateData.education = data.education;
    if (data.experience !== undefined) updateData.experience = data.experience;
    if (data.hourlyRate !== undefined) updateData.hourlyRate = new Prisma.Decimal(data.hourlyRate);
    if (data.availableHours !== undefined) updateData.availableHours = data.availableHours; // ✅ JSON

    return prisma.tutorProfile.update({
      where: { id: tutorId },
      data: updateData,
    });
  }

  /**
   * Search tutors by criteria
   */
  async searchTutors(filters: {
    subjectId?: string;     // Changed from specialization
    minRating?: number;
    maxPrice?: number;
    isVerified?: boolean;
  }): Promise<any[]> {
    const whereConditions: Prisma.TutorProfileWhereInput = {
      AND: [
        // ✅ Search in subjectIds array using hasSome
        filters.subjectId
          ? { subjectIds: { hasSome: [filters.subjectId] } }
          : {},
        filters.minRating !== undefined
          ? { rating: { gte: new Prisma.Decimal(filters.minRating) } }
          : {},
        filters.maxPrice !== undefined
          ? { hourlyRate: { lte: new Prisma.Decimal(filters.maxPrice) } }
          : {},
        filters.isVerified !== undefined
          ? { isVerified: filters.isVerified }
          : {},
      ].filter(
        (condition) => Object.keys(condition).length > 0
      ) as Prisma.TutorProfileWhereInput[],
    };

    const tutors = await prisma.tutorProfile.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,   // ✅ Correct field
          },
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ rating: 'desc' }, { totalReviews: 'desc' }],
      take: 20,
    });

    return tutors;
  }

  /**
   * Add tutor availability (Using JSON field)
   */
  async addAvailability(
    tutorId: string,
    availability: TutorAvailabilityInput
  ): Promise<TutorProfile> {
    if (!this.isValidTimeFormat(availability.startTime)) {
      throw new Error('Invalid start time format');
    }
    if (!this.isValidTimeFormat(availability.endTime)) {
      throw new Error('Invalid end time format');
    }

    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: tutorId },
    });

    if (!tutor) {
      throw new Error('Tutor not found');
    }

    // ✅ Use JSON field instead of separate model
    const currentAvailability = (tutor.availableHours as Record<string, any>) || {};
    const key = `day_${availability.dayOfWeek}`;

    if (!currentAvailability[key]) {
      currentAvailability[key] = [];
    }

    currentAvailability[key].push({
      startTime: availability.startTime,
      endTime: availability.endTime,
    });

    return prisma.tutorProfile.update({
      where: { id: tutorId },
      data: { availableHours: currentAvailability },
    });
  }

  /**
   * Get tutor availability
   */
  async getTutorAvailability(tutorId: string): Promise<any> {
    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      select: { availableHours: true },
    });

    return tutor?.availableHours || {};
  }

  /**
   * Remove availability slot
   */
  async removeAvailability(tutorId: string, dayOfWeek: number, index: number): Promise<TutorProfile> {
    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: tutorId },
    });

    if (!tutor) {
      throw new Error('Tutor not found');
    }

    const currentAvailability = (tutor.availableHours as Record<string, any>) || {};
    const key = `day_${dayOfWeek}`;

    if (currentAvailability[key] && Array.isArray(currentAvailability[key])) {
      currentAvailability[key].splice(index, 1);
    }

    return prisma.tutorProfile.update({
      where: { id: tutorId },
      data: { availableHours: currentAvailability },
    });
  }

  /**
   * Book a tutor
   */
  async bookTutor(
    studentId: string,
    data: BookTutorInput
  ): Promise<Booking> {
    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: data.tutorId },
      include: { user: true },
    });

    if (!tutor) {
      throw new Error('Tutor not found');
    }

    // ✅ Calculate total amount
    const durationInHours = data.duration / 60;
    const totalAmount = durationInHours * Number(tutor.hourlyRate);

    return prisma.booking.create({
      data: {
        student: { connect: { id: studentId } },     // ✅ Student relation
        tutor: { connect: { id: tutor.userId } },    // ✅ Tutor (User) relation - REQUIRED
        tutorProfile: { connect: { id: data.tutorId } },  // ✅ TutorProfile relation
        subject: data.subject,
        scheduledAt: data.scheduledAt,               // ✅ Correct field name
        duration: data.duration,
        hourlyRate: new Prisma.Decimal(tutor.hourlyRate),
        totalAmount: new Prisma.Decimal(totalAmount),  // ✅ Correct field name
        status: BookingStatus.PENDING,
      },
    });
  }

  /**
   * Get booking details
   */
  async getBooking(bookingId: string): Promise<any | null> {
    return prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,    // ✅ Correct field
          },
        },
        tutorProfile: {
          select: {
            id: true,
            hourlyRate: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get user's bookings (as student)
   */
  async getStudentBookings(
    studentId: string,
    status?: BookingStatus
  ): Promise<any[]> {
    return prisma.booking.findMany({
      where: {
        studentId,
        ...(status && { status }),
      },
      include: {
        tutorProfile: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,  // ✅ Correct field
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },  // ✅ Correct field name
    });
  }

  /**
   * Get tutor's bookings
   */
  async getTutorBookings(
    tutorId: string,
    status?: BookingStatus
  ): Promise<any[]> {
    return prisma.booking.findMany({
      where: {
        tutorProfile: {
          id: tutorId,  // ✅ Query by tutorProfile id
        },
        ...(status && { status }),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,   // ✅ Correct field
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },  // ✅ Correct field name
    });
  }

  /**
   * Confirm booking
   */
  async confirmBooking(bookingId: string): Promise<Booking | null> {
    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
    });
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string): Promise<Booking | null> {
    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });
  }

  /**
   * Reschedule booking
   */
  async rescheduleBooking(
    bookingId: string,
    newDate: Date,
    newDuration: number
  ): Promise<Booking | null> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) return null;

    // ✅ Recalculate with correct field name
    const durationInHours = newDuration / 60;
    const newTotalAmount = durationInHours * Number(booking.hourlyRate);

    return prisma.booking.update({
      where: { id: bookingId },
      data: {
        scheduledAt: newDate,              // ✅ Correct field
        duration: newDuration,
        totalAmount: new Prisma.Decimal(newTotalAmount),  // ✅ Correct field
        status: BookingStatus.RESCHEDULED,
      },
    });
  }

  /**
   * Complete booking
   */
  async completeBooking(bookingId: string): Promise<Booking | null> {
    return prisma.booking.update({
      where: { id: bookingId },
      data: { 
        status: BookingStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Leave review for tutor - REFACTORED FOR YOUR SCHEMA
   */
  async leaveTutorReview(
    bookingId: string,  // ✅ Use bookingId instead of studentId/tutorId
    data: { rating: number; comment?: string }
  ): Promise<any> {
    if (data.rating < 1 || data.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // ✅ Check if review already exists for this booking (unique constraint)
    const existingReview = await prisma.tutorReview.findUnique({
      where: { bookingId },
    });

    if (existingReview) {
      // ✅ Update existing review
      return prisma.tutorReview.update({
        where: { id: existingReview.id },
        data: {
          rating: data.rating,
          comment: data.comment,
        },
      });
    }

    // Get booking details to extract tutorId
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tutorProfile: true },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // ✅ Create new review - tied to booking
    const review = await prisma.tutorReview.create({
      data: {
        booking: { connect: { id: bookingId } },
        tutor: { connect: { id: booking.tutorId } },  // ✅ Connect to tutor User via tutorId field
        TutorProfile: { connect: { id: booking.tutorId } },  // ✅ Connect to profile
        rating: data.rating,
        comment: data.comment,
      },
    });

    // ✅ Update tutor rating
    await this.updateTutorRating(booking.tutorId);

    return review;
  }

  /**
   * Get tutor reviews
   */
  async getTutorReviews(tutorId: string): Promise<any[]> {
    return prisma.tutorReview.findMany({
      where: { tutorId },
      include: {
        booking: {
          select: {
            id: true,
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,  // ✅ Correct field
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update tutor rating based on reviews
   */
  private async updateTutorRating(tutorId: string): Promise<void> {
    const reviews = await prisma.tutorReview.findMany({
      where: { tutorId },
    });

    if (reviews.length === 0) return;

    const averageRating =
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    await prisma.tutorProfile.update({
      where: { id: tutorId },
      data: {
        rating: new Prisma.Decimal(averageRating),
        totalReviews: reviews.length,
      },
    });
  }

  /**
   * Get tutor earnings summary
   */
  async getTutorEarnings(tutorId: string) {
    const completedBookings = await prisma.booking.findMany({
      where: {
        tutorProfile: {
          id: tutorId,  // ✅ Query by tutorProfile
        },
        status: BookingStatus.COMPLETED,
      },
    });

    // ✅ Use totalAmount (correct field name)
    const totalEarnings = completedBookings.reduce(
      (sum, booking) => sum + Number(booking.totalAmount),
      0
    );

    const now = new Date();
    const thisMonthEarnings = completedBookings
      .filter((booking) => {
        const bookingDate = new Date(booking.createdAt);
        return (
          bookingDate.getMonth() === now.getMonth() &&
          bookingDate.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, booking) => sum + Number(booking.totalAmount), 0);  // ✅ Correct field

    return {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      thisMonthEarnings: Math.round(thisMonthEarnings * 100) / 100,
      completedSessions: completedBookings.length,
    };
  }

  /**
   * Verify time format HH:mm
   */
  private isValidTimeFormat(time: string): boolean {
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  }
}

export default TutoringService;