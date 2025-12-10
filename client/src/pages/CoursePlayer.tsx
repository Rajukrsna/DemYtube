import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { authFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Play,
  CheckCircle,
  Clock,
  Send,
  Loader2,
  BookOpen,
  MessageSquare,
  FileQuestion,
  FileText,
  Award,
  ChevronRight,
} from "lucide-react";
import type { CourseWithInstructor, SectionWithLessons, Lesson, ChatMessage, Quiz, Question, LessonProgress, Enrollment } from "@shared/schema";

interface QuizQuestion extends Question {
  options: { id: string; text: string }[];
}

export default function CoursePlayer() {
  const [, params] = useRoute("/learn/:courseId");
  const courseId = params?.courseId;
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const watchTimeRef = useRef<number>(0);
  const watchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithInstructor>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: enrollment } = useQuery<Enrollment>({
    queryKey: ["/api/enrollments", courseId],
    enabled: !!courseId && isAuthenticated,
  });

  const { data: lessonProgress } = useQuery<LessonProgress[]>({
    queryKey: ["/api/progress", courseId],
    enabled: !!courseId && isAuthenticated,
  });

  const { data: chatMessages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", courseId],
    enabled: !!courseId && isAuthenticated,
  });

  const { data: quiz } = useQuery<Quiz & { questions: QuizQuestion[] }>({
    queryKey: ["/api/quizzes", courseId],
    enabled: !!courseId,
  });

  const { data: courseCertificate } = useQuery<any>({
    queryKey: ["/api/certificates/my"],
    enabled: !!courseId && isAuthenticated,
    select: (certificates: any[]) => {
      return certificates?.find((cert: any) => cert.courseId === courseId);
    },
  });

  const updateWatchTimeMutation = useMutation({
    mutationFn: async ({ lessonId, seconds }: { lessonId: string; seconds: number }) => {
      await authFetch(`/api/progress/${lessonId}/watch-time`, {
        method: "POST",
        body: JSON.stringify({ watchedSeconds: seconds })
      });
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const response = await authFetch(`/api/progress/${lessonId}/complete`, {
        method: "POST"
      });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress", courseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments", courseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates/my"] });
      
      // Check if certificate was issued
      if (result.data.certificate) {
        toast({
          title: "🎉 Congratulations!",
          description: result.data.message || "You've completed the course and earned a certificate!",
          duration: 5000,
        });
      }
    },
  });

  const toggleLessonCompleteMutation = useMutation({
    mutationFn: async ({ lessonId, completed }: { lessonId: string; completed: boolean }) => {
      if (completed) {
        // Mark as incomplete
        await authFetch(`/api/progress/${lessonId}/uncomplete`, {
          method: "POST"
        });
      } else {
        // Mark as complete
        const response = await authFetch(`/api/progress/${lessonId}/complete`, {
          method: "POST"
        });
        return response.json();
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress", courseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments", courseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates/my"] });
      
      // Check if certificate was issued
      if (result?.data?.certificate) {
        toast({
          title: "🎉 Congratulations!",
          description: result.data.message || "You've completed the course and earned a certificate!",
          duration: 5000,
        });
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      await authFetch(`/api/chat/${courseId}`, {
        method: "POST",
        body: JSON.stringify({ content })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", courseId] });
      setChatInput("");
    },
  });

  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await authFetch(`/api/quizzes/${quiz?.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: quizAnswers })
      });
      const result = await response.json();
      return result.data;
    },
    onSuccess: (data: any) => {
      setQuizSubmitted(true);
      setQuizScore(data.score);
      toast({
        title: "Quiz Submitted",
        description: `You scored ${data.score}/${data.totalQuestions}`,
      });
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (course?.sections && course.sections.length > 0) {
      const firstSection = course.sections[0];
      if (firstSection?.lessons && firstSection.lessons.length > 0) {
        setActiveLesson(firstSection.lessons[0]);
      }
    }
  }, [course]);

  // Track watch time for active lesson
  useEffect(() => {
    if (!activeLesson) return;

    // Reset watch time when lesson changes
    watchTimeRef.current = 0;

    // Start timer to track watch time
    watchTimerRef.current = setInterval(() => {
      watchTimeRef.current += 1;

      // Save watch time every 10 seconds
      if (watchTimeRef.current % 10 === 0) {
        updateWatchTimeMutation.mutate({
          lessonId: activeLesson.id,
          seconds: watchTimeRef.current,
        });
      }
    }, 1000);

    // Cleanup on lesson change or unmount
    return () => {
      if (watchTimerRef.current) {
        clearInterval(watchTimerRef.current);
        // Save final watch time
        if (watchTimeRef.current > 0) {
          updateWatchTimeMutation.mutate({
            lessonId: activeLesson.id,
            seconds: watchTimeRef.current,
          });
        }
      }
    };
  }, [activeLesson?.id]);

  const isLessonCompleted = (lessonId: string) => {
    return lessonProgress?.some((p) => p.lessonId === lessonId && p.completed) ?? false;
  };

  const getTotalLessons = () => {
    return course?.sections?.reduce((total, section) => total + (section.lessons?.length || 0), 0) || 0;
  };

  const getCompletedLessons = () => {
    return lessonProgress?.filter((p) => p.completed)?.length || 0;
  };

  const progressPercent = Math.round((getCompletedLessons() / getTotalLessons()) * 100) || 0;

  const getYouTubeEmbedUrl = (lesson: Lesson | null) => {
    if (!lesson?.youtubeVideoId) return "";
    return `https://www.youtube.com/embed/${lesson.youtubeVideoId}?autoplay=0&rel=0`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (authLoading || courseLoading) {
    return (
      <div className="h-screen flex">
        <div className="w-[60%] p-4">
          <Skeleton className="w-full aspect-video" />
        </div>
        <div className="w-[40%] p-4">
          <Skeleton className="h-full" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-8 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Course not found</h2>
          <p className="text-muted-foreground">This course may have been removed or doesn't exist.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col lg:flex-row">
      {/* Video Player - Left Column (60%) */}
      <div className="lg:w-[60%] flex flex-col bg-black">
        {/* Video */}
        <div className="relative aspect-video bg-black">
          {activeLesson ? (
            <iframe
              src={getYouTubeEmbedUrl(activeLesson)}
              title={activeLesson.title}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              data-testid="video-player"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <p>Select a lesson to begin</p>
            </div>
          )}
        </div>

        {/* Course Completion Banner */}
        {courseCertificate && progressPercent === 100 && (
          <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-t border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/20">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  🎉 Congratulations! Course Completed
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  You've earned a certificate of completion
                </p>
              </div>
              <Link href={`/certificate/${courseCertificate.id}`}>
                <Button variant="default" className="gap-2">
                  <Award className="h-4 w-4" />
                  View Certificate
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Video Controls */}
        <div className="p-4 bg-background border-t">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold truncate" data-testid="text-lesson-title">
                {activeLesson?.title || "Select a lesson"}
              </h2>
              {activeLesson && (
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(activeLesson.duration || 0)}
                </p>
              )}
            </div>

            {activeLesson && (
              <Button
                variant={isLessonCompleted(activeLesson.id) ? "secondary" : "default"}
                onClick={() => markCompleteMutation.mutate(activeLesson.id)}
                disabled={markCompleteMutation.isPending || isLessonCompleted(activeLesson.id)}
                data-testid="button-mark-complete"
              >
                {isLessonCompleted(activeLesson.id) ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completed
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Complete
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar - Right Column (40%) */}
      <div className="lg:w-[40%] flex flex-col border-l bg-background">
        {/* Course Header */}
        <div className="p-4 border-b">
          <h1 className="font-semibold text-lg mb-2 line-clamp-1" data-testid="text-course-title">
            {course.title}
          </h1>
          <div className="flex items-center gap-2 text-sm">
            <Progress value={progressPercent} className="h-2 flex-1" />
            <span className="text-muted-foreground whitespace-nowrap">
              {getCompletedLessons()}/{getTotalLessons()} lessons
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="outline" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2 grid grid-cols-4">
            <TabsTrigger value="outline" className="gap-1 text-xs" data-testid="tab-outline">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Outline</span>
            </TabsTrigger>
            <TabsTrigger value="assistant" className="gap-1 text-xs" data-testid="tab-assistant">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
            <TabsTrigger value="quiz" className="gap-1 text-xs" data-testid="tab-quiz">
              <FileQuestion className="h-4 w-4" />
              <span className="hidden sm:inline">Quiz</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1 text-xs" data-testid="tab-notes">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
          </TabsList>

          {/* Outline Tab */}
          <TabsContent value="outline" className="flex-1 m-0 mt-2">
            <ScrollArea className="h-[calc(100vh-280px)] lg:h-[calc(100vh-240px)]">
              <div className="px-4 pb-4">
                <Accordion type="multiple" defaultValue={course.sections?.map((s) => s.id) || []}>
                  {course.sections?.map((section, sectionIndex) => {
                    const sectionLessons = section.lessons || [];
                    const completedInSection = sectionLessons.filter((l) => isLessonCompleted(l.id)).length;

                    return (
                      <AccordionItem key={section.id} value={section.id}>
                        <AccordionTrigger className="text-sm hover:no-underline" data-testid={`accordion-section-${section.id}`}>
                          <div className="flex items-center gap-2 text-left">
                            <span className="font-medium">Section {sectionIndex + 1}: {section.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {completedInSection}/{sectionLessons.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1">
                            {sectionLessons.map((lesson, lessonIndex) => {
                              const isCompleted = isLessonCompleted(lesson.id);
                              return (
                              <button
                                key={lesson.id}
                                onClick={() => setActiveLesson(lesson)}
                                className={`w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors ${
                                  activeLesson?.id === lesson.id
                                    ? "bg-accent"
                                    : "hover:bg-muted"
                                }`}
                                data-testid={`button-lesson-${lesson.id}`}
                              >
                                <Checkbox
                                  checked={isCompleted}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLessonCompleteMutation.mutate({
                                      lessonId: lesson.id,
                                      completed: isCompleted,
                                    });
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="truncate">{lessonIndex + 1}. {lesson.title}</p>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDuration(lesson.duration || 0)}
                                </span>
                                {activeLesson?.id === lesson.id && (
                                  <Play className="h-4 w-4 text-primary" />
                                )}
                              </button>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* AI Assistant Tab */}
          <TabsContent value="assistant" className="flex-1 m-0 mt-2 flex flex-col">
            <ScrollArea className="flex-1 h-[calc(100vh-340px)] lg:h-[calc(100vh-300px)]">
              <div className="px-4 space-y-4">
                {chatMessages && chatMessages.length > 0 ? (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                        data-testid={`chat-message-${msg.id}`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                    <p className="font-medium">Ask me anything about this course</p>
                    <p className="text-sm mt-1">I'll answer based on the video content</p>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t mt-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chatInput.trim()) {
                    sendMessageMutation.mutate(chatInput.trim());
                  }
                }}
                className="flex gap-2"
              >
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-chat"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!chatInput.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-chat"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quiz" className="flex-1 m-0 mt-2">
            <ScrollArea className="h-[calc(100vh-280px)] lg:h-[calc(100vh-240px)]">
              <div className="px-4 pb-4 space-y-4">
                {quiz && quiz.questions && quiz.questions.length > 0 ? (
                  <>
                    {quizSubmitted ? (
                      <Card className="p-6 text-center">
                        <Award className="h-16 w-16 mx-auto mb-4 text-amber-500" />
                        <h3 className="text-xl font-semibold mb-2">Quiz Complete!</h3>
                        <p className="text-3xl font-bold text-primary mb-4">
                          {quizScore}/{quiz.questions.length}
                        </p>
                        <Button
                          onClick={() => {
                            setQuizSubmitted(false);
                            setQuizAnswers({});
                            setQuizScore(null);
                          }}
                          data-testid="button-retry-quiz"
                        >
                          Try Again
                        </Button>
                      </Card>
                    ) : (
                      <>
                        <div className="text-sm text-muted-foreground mb-4">
                          {quiz.questions.length} questions
                        </div>
                        {quiz.questions.map((question, index) => (
                          <Card key={question.id} data-testid={`card-question-${question.id}`}>
                            <CardContent className="p-4">
                              <p className="font-medium mb-3">
                                {index + 1}. {question.questionText}
                              </p>
                              {question.questionType === "mcq" && question.options ? (
                                <div className="space-y-2">
                                  {(question.options as { id: string; text: string }[]).map((option) => (
                                    <label
                                      key={option.id}
                                      className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted"
                                    >
                                      <input
                                        type="radio"
                                        name={question.id}
                                        value={option.id}
                                        checked={quizAnswers[question.id] === option.id}
                                        onChange={() =>
                                          setQuizAnswers({ ...quizAnswers, [question.id]: option.id })
                                        }
                                        className="accent-primary"
                                      />
                                      <span className="text-sm">{option.text}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <Input
                                  placeholder="Your answer..."
                                  value={quizAnswers[question.id] || ""}
                                  onChange={(e) =>
                                    setQuizAnswers({ ...quizAnswers, [question.id]: e.target.value })
                                  }
                                  data-testid={`input-answer-${question.id}`}
                                />
                              )}
                            </CardContent>
                          </Card>
                        ))}
                        <Button
                          onClick={() => submitQuizMutation.mutate()}
                          disabled={submitQuizMutation.isPending}
                          className="w-full"
                          data-testid="button-submit-quiz"
                        >
                          {submitQuizMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Submit Quiz
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileQuestion className="h-12 w-12 mx-auto mb-4" />
                    <p className="font-medium">No quiz available</p>
                    <p className="text-sm mt-1">Check back later for practice questions</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="flex-1 m-0 mt-2">
            <ScrollArea className="h-[calc(100vh-280px)] lg:h-[calc(100vh-240px)]">
              <div className="px-4 pb-4">
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <p className="font-medium">Notes & Resources</p>
                  <p className="text-sm mt-1">Course materials will appear here</p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
