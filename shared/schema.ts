import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table - works with Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).default("user").notNull(), // user, instructor, admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnail: varchar("thumbnail"),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
  isFree: boolean("is_free").default(true),
  isPublic: boolean("is_public").default(false), // false = personal course, true = marketplace course
  tags: text("tags").array(),
  status: varchar("status", { length: 20 }).default("approved").notNull(), // draft, pending, approved, rejected
  rejectionFeedback: text("rejection_feedback"),
  totalDuration: integer("total_duration").default(0), // in seconds
  enrollmentCount: integer("enrollment_count").default(0),
  completionCount: integer("completion_count").default(0),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sections table
export const sections = pgTable("sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lessons table
export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionId: varchar("section_id").notNull().references(() => sections.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  youtubeUrl: varchar("youtube_url").notNull(),
  youtubeVideoId: varchar("youtube_video_id").notNull(),
  duration: integer("duration").default(0), // in seconds
  order: integer("order").notNull(),
  transcript: text("transcript"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Enrollments table
export const enrollments = pgTable("enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  progressPercent: integer("progress_percent").default(0),
});

// Lesson progress tracking
export const lessonProgress = pgTable("lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  completed: boolean("completed").default(false),
  watchedSeconds: integer("watched_seconds").default(0),
  completedAt: timestamp("completed_at"),
});

// Quizzes for courses
export const quizzes = pgTable("quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quiz questions
export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type", { length: 20 }).notNull(), // mcq, short_answer
  options: jsonb("options"), // For MCQ: [{id, text}]
  correctAnswer: text("correct_answer").notNull(), // For MCQ: option id, for short_answer: text
  order: integer("order").notNull(),
});

// Quiz attempts
export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  quizId: varchar("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  score: integer("score").default(0),
  totalQuestions: integer("total_questions").notNull(),
  answers: jsonb("answers"), // [{questionId, answer, isCorrect}]
  completedAt: timestamp("completed_at").defaultNow(),
});

// AI Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // user, assistant
  content: text("content").notNull(),
  sources: jsonb("sources"), // [{lessonId, timestamp, snippet}]
  createdAt: timestamp("created_at").defaultNow(),
});

// User notes for lessons
export const lessonNotes = pgTable("lesson_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp").notNull(), // Video timestamp in seconds
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Video transcripts for RAG
export const videoTranscripts = pgTable("video_transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  transcript: text("transcript").notNull(), // Raw transcript text
  source: varchar("source", { length: 20 }).notNull(), // 'youtube_captions', 'whisper_asr'
  language: varchar("language", { length: 10 }).default("en"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("IDX_video_transcripts_lesson").on(table.lessonId)]);

// Text chunks for RAG (vectorized)
export const textChunks = pgTable("text_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  transcriptId: varchar("transcript_id").notNull().references(() => videoTranscripts.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(), // Order within the transcript
  content: text("content").notNull(), // Chunked text content
  startTime: integer("start_time").notNull(), // Start timestamp in seconds
  endTime: integer("end_time").notNull(), // End timestamp in seconds
  tokenCount: integer("token_count").notNull(), // Approximate token count
  embedding: text("embedding"), // JSON string of embedding vector (will use pgvector extension)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_text_chunks_lesson").on(table.lessonId),
  index("IDX_text_chunks_transcript").on(table.transcriptId),
]);

// Certificates
export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uniqueId: varchar("unique_id").unique().notNull(), // For verification
  userId: varchar("user_id").notNull().references(() => users.id),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  issuedAt: timestamp("issued_at").defaultNow(),
  userName: varchar("user_name"),
  courseName: varchar("course_name"),
  totalDuration: integer("total_duration").default(0), // in seconds
});

// Transactions for payments
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  stripeSessionId: varchar("stripe_session_id"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  courses: many(courses),
  enrollments: many(enrollments),
  certificates: many(certificates),
  transactions: many(transactions),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id],
  }),
  sections: many(sections),
  enrollments: many(enrollments),
  quizzes: many(quizzes),
  certificates: many(certificates),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  course: one(courses, {
    fields: [sections.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  section: one(sections, {
    fields: [lessons.sectionId],
    references: [sections.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  course: one(courses, {
    fields: [quizzes.courseId],
    references: [courses.id],
  }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [questions.quizId],
    references: [quizzes.id],
  }),
}));

export const lessonNotesRelations = relations(lessonNotes, ({ one }) => ({
  user: one(users, {
    fields: [lessonNotes.userId],
    references: [users.id],
  }),
  lesson: one(lessons, {
    fields: [lessonNotes.lessonId],
    references: [lessons.id],
  }),
  course: one(courses, {
    fields: [lessonNotes.courseId],
    references: [courses.id],
  }),
}));

export const videoTranscriptsRelations = relations(videoTranscripts, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [videoTranscripts.lessonId],
    references: [lessons.id],
  }),
  chunks: many(textChunks),
}));

export const textChunksRelations = relations(textChunks, ({ one }) => ({
  lesson: one(lessons, {
    fields: [textChunks.lessonId],
    references: [lessons.id],
  }),
  transcript: one(videoTranscripts, {
    fields: [textChunks.transcriptId],
    references: [videoTranscripts.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCourseSchema = createInsertSchema(courses).omit({ id: true, createdAt: true, updatedAt: true, enrollmentCount: true, completionCount: true, viewCount: true });
export const insertSectionSchema = createInsertSchema(sections).omit({ id: true, createdAt: true });
export const insertLessonSchema = createInsertSchema(lessons).omit({ id: true, createdAt: true });
export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({ id: true, enrolledAt: true });
export const insertLessonProgressSchema = createInsertSchema(lessonProgress).omit({ id: true });
export const insertQuizSchema = createInsertSchema(quizzes).omit({ id: true, createdAt: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({ id: true, completedAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertLessonNoteSchema = createInsertSchema(lessonNotes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVideoTranscriptSchema = createInsertSchema(videoTranscripts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTextChunkSchema = createInsertSchema(textChunks).omit({ id: true, createdAt: true });
export const insertCertificateSchema = createInsertSchema(certificates).omit({ id: true, issuedAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Section = typeof sections.$inferSelect;
export type InsertSection = z.infer<typeof insertSectionSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Enrollment = typeof enrollments.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type InsertLessonProgress = z.infer<typeof insertLessonProgressSchema>;
export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type LessonNote = typeof lessonNotes.$inferSelect;
export type InsertLessonNote = z.infer<typeof insertLessonNoteSchema>;
export type VideoTranscript = typeof videoTranscripts.$inferSelect;
export type InsertVideoTranscript = z.infer<typeof insertVideoTranscriptSchema>;
export type TextChunk = typeof textChunks.$inferSelect;
export type InsertTextChunk = z.infer<typeof insertTextChunkSchema>;
export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

// Extended types for frontend
export type CourseWithInstructor = Course & {
  instructor: User;
  sections?: SectionWithLessons[];
};

export type SectionWithLessons = Section & {
  lessons: Lesson[];
};

export type EnrollmentWithCourse = Enrollment & {
  course: CourseWithInstructor;
};
