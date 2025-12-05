import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  courses,
  sections,
  lessons,
  enrollments,
  lessonProgress,
  quizzes,
  questions,
  quizAttempts,
  chatMessages,
  certificates,
  transactions,
  type User,
  type UpsertUser,
  type Course,
  type InsertCourse,
  type Section,
  type InsertSection,
  type Lesson,
  type InsertLesson,
  type Enrollment,
  type InsertEnrollment,
  type LessonProgress,
  type InsertLessonProgress,
  type Quiz,
  type InsertQuiz,
  type Question,
  type InsertQuestion,
  type QuizAttempt,
  type InsertQuizAttempt,
  type ChatMessage,
  type InsertChatMessage,
  type Certificate,
  type InsertCertificate,
  type Transaction,
  type InsertTransaction,
  type CourseWithInstructor,
  type SectionWithLessons,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;

  // Courses
  getCourse(id: string): Promise<CourseWithInstructor | undefined>;
  getCourses(filters?: { status?: string; instructorId?: string }): Promise<CourseWithInstructor[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, updates: Partial<Course>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<void>;

  // Sections
  getSectionsByCourse(courseId: string): Promise<SectionWithLessons[]>;
  createSection(section: InsertSection): Promise<Section>;
  updateSection(id: string, updates: Partial<Section>): Promise<Section | undefined>;
  deleteSection(id: string): Promise<void>;

  // Lessons
  getLesson(id: string): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson | undefined>;
  deleteLesson(id: string): Promise<void>;

  // Enrollments
  getEnrollment(userId: string, courseId: string): Promise<Enrollment | undefined>;
  getEnrollmentsByUser(userId: string): Promise<(Enrollment & { course: CourseWithInstructor })[]>;
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  updateEnrollment(id: string, updates: Partial<Enrollment>): Promise<Enrollment | undefined>;

  // Lesson Progress
  getLessonProgress(userId: string, courseId: string): Promise<LessonProgress[]>;
  upsertLessonProgress(progress: InsertLessonProgress): Promise<LessonProgress>;
  markLessonComplete(userId: string, lessonId: string): Promise<LessonProgress>;

  // Quizzes
  getQuizByCourse(courseId: string): Promise<(Quiz & { questions: Question[] }) | undefined>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  
  // Quiz Attempts
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  getQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]>;

  // Chat Messages
  getChatMessages(userId: string, courseId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Certificates
  getCertificate(id: string): Promise<Certificate | undefined>;
  getCertificatesByUser(userId: string): Promise<Certificate[]>;
  getCertificateByUserAndCourse(userId: string, courseId: string): Promise<Certificate | undefined>;
  createCertificate(certificate: InsertCertificate): Promise<Certificate>;

  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  getTransactionByStripeSession(sessionId: string): Promise<Transaction | undefined>;

  // Admin Stats
  getAdminStats(): Promise<{
    totalCourses: number;
    totalUsers: number;
    totalEnrollments: number;
    pendingReviews: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Courses
  async getCourse(id: string): Promise<CourseWithInstructor | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    if (!course) return undefined;

    const [instructor] = await db.select().from(users).where(eq(users.id, course.instructorId));
    const sectionsWithLessons = await this.getSectionsByCourse(id);

    return {
      ...course,
      instructor,
      sections: sectionsWithLessons,
    };
  }

  async getCourses(filters?: { status?: string; instructorId?: string }): Promise<CourseWithInstructor[]> {
    let query = db.select().from(courses).orderBy(desc(courses.createdAt));
    
    const allCourses = await query;
    
    let filtered = allCourses;
    if (filters?.status) {
      filtered = filtered.filter(c => c.status === filters.status);
    }
    if (filters?.instructorId) {
      filtered = filtered.filter(c => c.instructorId === filters.instructorId);
    }

    const coursesWithInstructors: CourseWithInstructor[] = [];
    for (const course of filtered) {
      const [instructor] = await db.select().from(users).where(eq(users.id, course.instructorId));
      const sectionsWithLessons = await this.getSectionsByCourse(course.id);
      coursesWithInstructors.push({
        ...course,
        instructor,
        sections: sectionsWithLessons,
      });
    }

    return coursesWithInstructors;
  }

  async createCourse(courseData: InsertCourse): Promise<Course> {
    const [course] = await db.insert(courses).values(courseData).returning();
    return course;
  }

  async updateCourse(id: string, updates: Partial<Course>): Promise<Course | undefined> {
    const [course] = await db
      .update(courses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return course;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
  }

  // Sections
  async getSectionsByCourse(courseId: string): Promise<SectionWithLessons[]> {
    const allSections = await db
      .select()
      .from(sections)
      .where(eq(sections.courseId, courseId))
      .orderBy(sections.order);

    const sectionsWithLessons: SectionWithLessons[] = [];
    for (const section of allSections) {
      const sectionLessons = await db
        .select()
        .from(lessons)
        .where(eq(lessons.sectionId, section.id))
        .orderBy(lessons.order);
      sectionsWithLessons.push({
        ...section,
        lessons: sectionLessons,
      });
    }

    return sectionsWithLessons;
  }

  async createSection(sectionData: InsertSection): Promise<Section> {
    const [section] = await db.insert(sections).values(sectionData).returning();
    return section;
  }

  async updateSection(id: string, updates: Partial<Section>): Promise<Section | undefined> {
    const [section] = await db
      .update(sections)
      .set(updates)
      .where(eq(sections.id, id))
      .returning();
    return section;
  }

  async deleteSection(id: string): Promise<void> {
    await db.delete(sections).where(eq(sections.id, id));
  }

  // Lessons
  async getLesson(id: string): Promise<Lesson | undefined> {
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
    return lesson;
  }

  async createLesson(lessonData: InsertLesson): Promise<Lesson> {
    const [lesson] = await db.insert(lessons).values(lessonData).returning();
    return lesson;
  }

  async updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson | undefined> {
    const [lesson] = await db
      .update(lessons)
      .set(updates)
      .where(eq(lessons.id, id))
      .returning();
    return lesson;
  }

  async deleteLesson(id: string): Promise<void> {
    await db.delete(lessons).where(eq(lessons.id, id));
  }

  // Enrollments
  async getEnrollment(userId: string, courseId: string): Promise<Enrollment | undefined> {
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));
    return enrollment;
  }

  async getEnrollmentsByUser(userId: string): Promise<(Enrollment & { course: CourseWithInstructor })[]> {
    const userEnrollments = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.userId, userId))
      .orderBy(desc(enrollments.enrolledAt));

    const result: (Enrollment & { course: CourseWithInstructor })[] = [];
    for (const enrollment of userEnrollments) {
      const course = await this.getCourse(enrollment.courseId);
      if (course) {
        result.push({ ...enrollment, course });
      }
    }

    return result;
  }

  async createEnrollment(enrollmentData: InsertEnrollment): Promise<Enrollment> {
    const [enrollment] = await db.insert(enrollments).values(enrollmentData).returning();
    
    // Increment enrollment count
    await db
      .update(courses)
      .set({ enrollmentCount: sql`${courses.enrollmentCount} + 1` })
      .where(eq(courses.id, enrollmentData.courseId));

    return enrollment;
  }

  async updateEnrollment(id: string, updates: Partial<Enrollment>): Promise<Enrollment | undefined> {
    const [enrollment] = await db
      .update(enrollments)
      .set(updates)
      .where(eq(enrollments.id, id))
      .returning();
    return enrollment;
  }

  // Lesson Progress
  async getLessonProgress(userId: string, courseId: string): Promise<LessonProgress[]> {
    const sectionsData = await this.getSectionsByCourse(courseId);
    const lessonIds = sectionsData.flatMap((s) => s.lessons.map((l) => l.id));

    if (lessonIds.length === 0) return [];

    const progress = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          sql`${lessonProgress.lessonId} = ANY(${lessonIds})`
        )
      );

    return progress;
  }

  async upsertLessonProgress(progressData: InsertLessonProgress): Promise<LessonProgress> {
    const existing = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, progressData.userId),
          eq(lessonProgress.lessonId, progressData.lessonId)
        )
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(lessonProgress)
        .set(progressData)
        .where(eq(lessonProgress.id, existing[0].id))
        .returning();
      return updated;
    }

    const [progress] = await db.insert(lessonProgress).values(progressData).returning();
    return progress;
  }

  async markLessonComplete(userId: string, lessonId: string): Promise<LessonProgress> {
    return this.upsertLessonProgress({
      userId,
      lessonId,
      completed: true,
      completedAt: new Date(),
    });
  }

  // Quizzes
  async getQuizByCourse(courseId: string): Promise<(Quiz & { questions: Question[] }) | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.courseId, courseId));
    if (!quiz) return undefined;

    const quizQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quiz.id))
      .orderBy(questions.order);

    return { ...quiz, questions: quizQuestions };
  }

  async createQuiz(quizData: InsertQuiz): Promise<Quiz> {
    const [quiz] = await db.insert(quizzes).values(quizData).returning();
    return quiz;
  }

  async createQuestion(questionData: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values(questionData).returning();
    return question;
  }

  // Quiz Attempts
  async createQuizAttempt(attemptData: InsertQuizAttempt): Promise<QuizAttempt> {
    const [attempt] = await db.insert(quizAttempts).values(attemptData).returning();
    return attempt;
  }

  async getQuizAttempts(userId: string, quizId: string): Promise<QuizAttempt[]> {
    return db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId)))
      .orderBy(desc(quizAttempts.completedAt));
  }

  // Chat Messages
  async getChatMessages(userId: string, courseId: string): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.userId, userId), eq(chatMessages.courseId, courseId)))
      .orderBy(chatMessages.createdAt);
  }

  async createChatMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessages).values(messageData).returning();
    return message;
  }

  // Certificates
  async getCertificate(id: string): Promise<Certificate | undefined> {
    const [certificate] = await db.select().from(certificates).where(eq(certificates.id, id));
    return certificate;
  }

  async getCertificatesByUser(userId: string): Promise<Certificate[]> {
    return db
      .select()
      .from(certificates)
      .where(eq(certificates.userId, userId))
      .orderBy(desc(certificates.issuedAt));
  }

  async getCertificateByUserAndCourse(userId: string, courseId: string): Promise<Certificate | undefined> {
    const [certificate] = await db
      .select()
      .from(certificates)
      .where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)));
    return certificate;
  }

  async createCertificate(certificateData: InsertCertificate): Promise<Certificate> {
    const [certificate] = await db.insert(certificates).values(certificateData).returning();
    return certificate;
  }

  // Transactions
  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(transactionData).returning();
    return transaction;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const [transaction] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return transaction;
  }

  async getTransactionByStripeSession(sessionId: string): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.stripeSessionId, sessionId));
    return transaction;
  }

  // Admin Stats
  async getAdminStats(): Promise<{
    totalCourses: number;
    totalUsers: number;
    totalEnrollments: number;
    pendingReviews: number;
  }> {
    const [courseCount] = await db.select({ count: sql<number>`count(*)` }).from(courses);
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [enrollmentCount] = await db.select({ count: sql<number>`count(*)` }).from(enrollments);
    const [pendingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(courses)
      .where(eq(courses.status, "pending"));

    return {
      totalCourses: Number(courseCount?.count || 0),
      totalUsers: Number(userCount?.count || 0),
      totalEnrollments: Number(enrollmentCount?.count || 0),
      pendingReviews: Number(pendingCount?.count || 0),
    };
  }
}

export const storage = new DatabaseStorage();
