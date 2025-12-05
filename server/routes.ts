import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import { randomUUID } from "crypto";
import OpenAI from "openai";

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // ============ AUTH ROUTES ============
  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  // ============ COURSE ROUTES ============
  
  // Get all approved courses (public)
  app.get("/api/courses", async (req, res) => {
    try {
      const courses = await storage.getCourses({ status: "approved" });
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Get instructor's courses
  app.get("/api/courses/my", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const courses = await storage.getCourses({ instructorId: user.id });
      res.json(courses);
    } catch (error) {
      console.error("Error fetching user courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Get single course
  app.get("/api/courses/:id", async (req, res) => {
    try {
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Increment view count
      await storage.updateCourse(course.id, {
        viewCount: (course.viewCount || 0) + 1,
      });
      
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  // Create course
  app.post("/api/courses", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { sections: sectionsData, ...courseData } = req.body;

      // Create the course
      const course = await storage.createCourse({
        ...courseData,
        instructorId: user.id,
        status: "pending",
        price: courseData.isFree ? "0" : (courseData.price || "0"),
      });

      // Create sections and lessons
      let totalDuration = 0;
      if (sectionsData && Array.isArray(sectionsData)) {
        for (const sectionData of sectionsData) {
          const section = await storage.createSection({
            courseId: course.id,
            title: sectionData.title,
            order: sectionData.order,
          });

          if (sectionData.lessons && Array.isArray(sectionData.lessons)) {
            for (const lessonData of sectionData.lessons) {
              await storage.createLesson({
                sectionId: section.id,
                title: lessonData.title,
                youtubeUrl: lessonData.youtubeUrl,
                youtubeVideoId: lessonData.youtubeVideoId,
                duration: lessonData.duration || 0,
                order: lessonData.order,
              });
              totalDuration += lessonData.duration || 0;
            }
          }
        }
      }

      // Update total duration
      await storage.updateCourse(course.id, { totalDuration });

      // Set thumbnail from first video if not provided
      if (!courseData.thumbnail && sectionsData?.[0]?.lessons?.[0]?.youtubeVideoId) {
        const videoId = sectionsData[0].lessons[0].youtubeVideoId;
        await storage.updateCourse(course.id, {
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        });
      }

      const fullCourse = await storage.getCourse(course.id);
      res.status(201).json(fullCourse);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // ============ YOUTUBE INFO ROUTE ============
  app.post("/api/youtube/info", isAuthenticated, async (req, res) => {
    try {
      const { videoId } = req.body;
      if (!videoId) {
        return res.status(400).json({ message: "Video ID required" });
      }

      // In a real app, you'd call YouTube API here
      // For now, return mock data
      res.json({
        videoId,
        title: `Video ${videoId.substring(0, 8)}`,
        duration: Math.floor(Math.random() * 600) + 120, // 2-12 minutes
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      });
    } catch (error) {
      console.error("Error fetching YouTube info:", error);
      res.status(500).json({ message: "Failed to fetch video info" });
    }
  });

  // ============ ENROLLMENT ROUTES ============
  
  // Get user's enrollments
  app.get("/api/enrollments/my", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const enrollments = await storage.getEnrollmentsByUser(user.id);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  // Get single enrollment
  app.get("/api/enrollments/:courseId", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const enrollment = await storage.getEnrollment(user.id, req.params.courseId);
      res.json(enrollment || null);
    } catch (error) {
      console.error("Error fetching enrollment:", error);
      res.status(500).json({ message: "Failed to fetch enrollment" });
    }
  });

  // Create enrollment (free courses)
  app.post("/api/enrollments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { courseId } = req.body;

      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (!course.isFree && parseFloat(course.price || "0") > 0) {
        return res.status(400).json({ message: "This course requires payment" });
      }

      const existing = await storage.getEnrollment(user.id, courseId);
      if (existing) {
        return res.status(400).json({ message: "Already enrolled" });
      }

      const enrollment = await storage.createEnrollment({
        userId: user.id,
        courseId,
      });

      res.status(201).json(enrollment);
    } catch (error) {
      console.error("Error creating enrollment:", error);
      res.status(500).json({ message: "Failed to enroll" });
    }
  });

  // ============ PROGRESS ROUTES ============
  
  // Get lesson progress for a course
  app.get("/api/progress/:courseId", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const progress = await storage.getLessonProgress(user.id, req.params.courseId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Mark lesson complete
  app.post("/api/progress/:lessonId/complete", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const progress = await storage.markLessonComplete(user.id, req.params.lessonId);

      // Check if course is complete and issue certificate
      const lesson = await storage.getLesson(req.params.lessonId);
      if (lesson) {
        // Get section to find course
        const sections = await storage.getSectionsByCourse("");
        // This is simplified - in production, trace back to course properly
      }

      res.json(progress);
    } catch (error) {
      console.error("Error marking complete:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // ============ QUIZ ROUTES ============
  
  // Get quiz for a course
  app.get("/api/quizzes/:courseId", async (req, res) => {
    try {
      const quiz = await storage.getQuizByCourse(req.params.courseId);
      res.json(quiz || null);
    } catch (error) {
      console.error("Error fetching quiz:", error);
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });

  // Submit quiz
  app.post("/api/quizzes/:quizId/submit", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { answers } = req.body;
      
      const quiz = await storage.getQuizByCourse(req.params.quizId);
      if (!quiz) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      let score = 0;
      const results: any[] = [];

      for (const question of quiz.questions) {
        const userAnswer = answers[question.id];
        const isCorrect = userAnswer === question.correctAnswer;
        if (isCorrect) score++;
        results.push({
          questionId: question.id,
          answer: userAnswer,
          isCorrect,
        });
      }

      const attempt = await storage.createQuizAttempt({
        userId: user.id,
        quizId: quiz.id,
        score,
        totalQuestions: quiz.questions.length,
        answers: results,
      });

      res.json({
        score,
        totalQuestions: quiz.questions.length,
        attempt,
      });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ message: "Failed to submit quiz" });
    }
  });

  // Generate quiz questions using AI
  app.post("/api/quizzes/generate/:courseId", isAuthenticated, async (req, res) => {
    try {
      const course = await storage.getCourse(req.params.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Get all lesson transcripts
      let transcripts = "";
      for (const section of course.sections || []) {
        for (const lesson of section.lessons || []) {
          if (lesson.transcript) {
            transcripts += `\n${lesson.title}:\n${lesson.transcript}\n`;
          }
        }
      }

      if (!transcripts && !process.env.OPENAI_API_KEY) {
        // Create mock quiz if no AI available
        const quiz = await storage.createQuiz({
          courseId: course.id,
          title: `${course.title} Practice Quiz`,
        });

        await storage.createQuestion({
          quizId: quiz.id,
          questionText: "What is the main topic of this course?",
          questionType: "mcq",
          options: [
            { id: "a", text: course.title },
            { id: "b", text: "Something else" },
            { id: "c", text: "Another topic" },
            { id: "d", text: "None of the above" },
          ],
          correctAnswer: "a",
          order: 0,
        });

        const fullQuiz = await storage.getQuizByCourse(course.id);
        return res.json(fullQuiz);
      }

      // Generate questions with OpenAI
      const openai = getOpenAI();
      if (!openai) {
        // Create mock quiz if no AI available
        const quiz = await storage.createQuiz({
          courseId: course.id,
          title: `${course.title} Practice Quiz`,
        });

        await storage.createQuestion({
          quizId: quiz.id,
          questionText: "What is the main topic of this course?",
          questionType: "mcq",
          options: [
            { id: "a", text: course.title },
            { id: "b", text: "Something else" },
            { id: "c", text: "Another topic" },
            { id: "d", text: "None of the above" },
          ],
          correctAnswer: "a",
          order: 0,
        });

        const fullQuiz = await storage.getQuizByCourse(course.id);
        return res.json(fullQuiz);
      }
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Generate 5 practice questions for a course. Mix multiple choice and short answer questions. 
            Return as JSON array: [{ questionText, questionType: "mcq" or "short_answer", options: [{id, text}] (for mcq), correctAnswer }]`,
          },
          {
            role: "user",
            content: `Course: ${course.title}\nDescription: ${course.description}\n\nGenerate practice questions.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const questionsData = JSON.parse(completion.choices[0].message.content || "{}");
      
      const quiz = await storage.createQuiz({
        courseId: course.id,
        title: `${course.title} Practice Quiz`,
      });

      for (let i = 0; i < (questionsData.questions || []).length; i++) {
        const q = questionsData.questions[i];
        await storage.createQuestion({
          quizId: quiz.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          correctAnswer: q.correctAnswer,
          order: i,
        });
      }

      const fullQuiz = await storage.getQuizByCourse(course.id);
      res.json(fullQuiz);
    } catch (error) {
      console.error("Error generating quiz:", error);
      res.status(500).json({ message: "Failed to generate quiz" });
    }
  });

  // ============ CHAT ROUTES (AI Assistant) ============
  
  // Get chat messages
  app.get("/api/chat/:courseId", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const messages = await storage.getChatMessages(user.id, req.params.courseId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat:", error);
      res.status(500).json({ message: "Failed to fetch chat" });
    }
  });

  // Send chat message
  app.post("/api/chat/:courseId", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { content } = req.body;
      const courseId = req.params.courseId;

      // Save user message
      await storage.createChatMessage({
        userId: user.id,
        courseId,
        role: "user",
        content,
      });

      // Get course context
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Generate AI response
      let aiResponse = "I'm sorry, I couldn't process your question. Please try again.";
      
      const openai = getOpenAI();
      if (openai) {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are a helpful course assistant for "${course.title}". 
                Course description: ${course.description}
                Help students understand the course content. Be concise and helpful.`,
              },
              {
                role: "user",
                content,
              },
            ],
          });
          aiResponse = completion.choices[0].message.content || aiResponse;
        } catch (e) {
          console.error("OpenAI error:", e);
        }
      } else {
        aiResponse = `Thank you for your question about "${course.title}". This is a demo response - connect OpenAI API for real answers.`;
      }

      // Save AI response
      const assistantMessage = await storage.createChatMessage({
        userId: user.id,
        courseId,
        role: "assistant",
        content: aiResponse,
      });

      const allMessages = await storage.getChatMessages(user.id, courseId);
      res.json(allMessages);
    } catch (error) {
      console.error("Error sending chat:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ============ CERTIFICATE ROUTES ============
  
  // Get user certificates
  app.get("/api/certificates/my", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const certificates = await storage.getCertificatesByUser(user.id);
      res.json(certificates);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      res.status(500).json({ message: "Failed to fetch certificates" });
    }
  });

  // Get single certificate
  app.get("/api/certificates/:id", async (req, res) => {
    try {
      const certificate = await storage.getCertificate(req.params.id);
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      res.json(certificate);
    } catch (error) {
      console.error("Error fetching certificate:", error);
      res.status(500).json({ message: "Failed to fetch certificate" });
    }
  });

  // Download certificate PDF
  app.get("/api/certificates/:id/pdf", async (req, res) => {
    try {
      const certificate = await storage.getCertificate(req.params.id);
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }

      // Generate simple PDF (in production, use a proper PDF library)
      const pdfContent = `
        Certificate of Completion
        
        This certifies that ${certificate.userName}
        has successfully completed the course
        "${certificate.courseName}"
        
        Issued: ${certificate.issuedAt}
        Certificate ID: ${certificate.uniqueId}
      `;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=certificate-${certificate.uniqueId}.pdf`
      );
      res.send(pdfContent);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // ============ PAYMENT ROUTES ============
  
  app.post("/api/payments/create-session", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { courseId } = req.body;

      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Check if already enrolled
      const existing = await storage.getEnrollment(user.id, courseId);
      if (existing) {
        return res.status(400).json({ message: "Already enrolled" });
      }

      // Create transaction record
      const transaction = await storage.createTransaction({
        userId: user.id,
        courseId,
        amount: course.price || "0",
        status: "pending",
      });

      // In production, create Stripe checkout session here
      // For now, simulate payment success
      await storage.updateTransaction(transaction.id, {
        status: "completed",
        stripeSessionId: `sim_${randomUUID()}`,
      });

      // Create enrollment
      await storage.createEnrollment({
        userId: user.id,
        courseId,
      });

      res.json({ 
        success: true, 
        url: `/learn/${courseId}`,
      });
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Failed to process payment" });
    }
  });

  // ============ ADMIN ROUTES ============
  
  // Get admin stats
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get courses by status for admin
  app.get("/api/admin/courses", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const status = req.query.status as string;
      const courses = await storage.getCourses({ status });
      res.json(courses);
    } catch (error) {
      console.error("Error fetching admin courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Approve course
  app.post("/api/admin/courses/:id/approve", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const course = await storage.updateCourse(req.params.id, { status: "approved" });
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error approving course:", error);
      res.status(500).json({ message: "Failed to approve course" });
    }
  });

  // Reject course
  app.post("/api/admin/courses/:id/reject", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { feedback } = req.body;
      const course = await storage.updateCourse(req.params.id, {
        status: "rejected",
        rejectionFeedback: feedback,
      });
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error rejecting course:", error);
      res.status(500).json({ message: "Failed to reject course" });
    }
  });

  // ============ COURSE ANALYTICS ============
  
  app.get("/api/courses/:courseId/analytics", isAuthenticated, async (req, res) => {
    try {
      const course = await storage.getCourse(req.params.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Return mock analytics for now
      res.json({
        totalEnrollments: course.enrollmentCount || 0,
        totalViews: course.viewCount || 0,
        completionRate: Math.floor(Math.random() * 40) + 30,
        averageProgress: Math.floor(Math.random() * 30) + 40,
        totalWatchTime: Math.floor(Math.random() * 10000) + 5000,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  return httpServer;
}
