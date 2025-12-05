import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Play,
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  Award,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import type { CourseWithInstructor, Enrollment } from "@shared/schema";

export default function CourseDetails() {
  const [, params] = useRoute("/course/:courseId");
  const courseId = params?.courseId;
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: course, isLoading } = useQuery<CourseWithInstructor>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: enrollment } = useQuery<Enrollment | null>({
    queryKey: ["/api/enrollments", courseId],
    enabled: !!courseId && isAuthenticated,
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (course?.isFree || parseFloat(course?.price || "0") === 0) {
        await apiRequest("POST", `/api/enrollments`, { courseId });
      } else {
        const response = await apiRequest("POST", `/api/payments/create-session`, { courseId });
        const data = await response.json();
        window.location.href = data.url;
        return;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments", courseId] });
      toast({
        title: "Enrolled Successfully",
        description: "You can now start learning!",
      });
    },
    onError: () => {
      toast({
        title: "Enrollment Failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTotalLessons = () => {
    return course?.sections?.reduce((total, section) => total + (section.lessons?.length || 0), 0) || 0;
  };

  const getInstructorInitials = () => {
    if (course?.instructor?.firstName && course?.instructor?.lastName) {
      return `${course.instructor.firstName[0]}${course.instructor.lastName[0]}`.toUpperCase();
    }
    return "IN";
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="aspect-video w-full rounded-lg mb-6" />
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-20 w-full mb-4" />
          </div>
          <div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Course not found</h2>
          <p className="text-muted-foreground mb-4">This course may have been removed or doesn't exist.</p>
          <Link href="/marketplace">
            <Button>Browse Courses</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const defaultThumbnail = `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1280&h=720&fit=crop`;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Course Info */}
            <div className="lg:col-span-2">
              <div className="aspect-video rounded-lg overflow-hidden mb-6">
                <img
                  src={course.thumbnail || defaultThumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4" data-testid="text-course-title">
                {course.title}
              </h1>

              <p className="text-muted-foreground text-lg mb-6">{course.description}</p>

              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={course.instructor?.profileImageUrl || undefined} />
                    <AvatarFallback>{getInstructorInitials()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {course.instructor?.firstName} {course.instructor?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">Instructor</p>
                  </div>
                </div>

                <Separator orientation="vertical" className="h-8" />

                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{course.enrollmentCount?.toLocaleString() || 0} students</span>
                </div>

                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(course.totalDuration || 0)}</span>
                </div>

                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>{getTotalLessons()} lessons</span>
                </div>
              </div>

              {course.tags && course.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {course.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Enrollment Card */}
            <div className="lg:sticky lg:top-24">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold mb-2">
                      {course.isFree ? "Free" : `$${course.price}`}
                    </div>
                    {!course.isFree && (
                      <p className="text-sm text-muted-foreground">One-time payment</p>
                    )}
                  </div>

                  {enrollment ? (
                    <Link href={`/learn/${course.id}`}>
                      <Button className="w-full gap-2" size="lg" data-testid="button-continue-learning">
                        <Play className="h-5 w-5" />
                        Continue Learning
                      </Button>
                    </Link>
                  ) : isAuthenticated ? (
                    <Button
                      className="w-full gap-2"
                      size="lg"
                      onClick={() => enrollMutation.mutate()}
                      disabled={enrollMutation.isPending}
                      data-testid="button-enroll"
                    >
                      {enrollMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : course.isFree ? (
                        <Play className="h-5 w-5" />
                      ) : (
                        <ShoppingCart className="h-5 w-5" />
                      )}
                      {course.isFree ? "Enroll Now - Free" : "Buy Now"}
                    </Button>
                  ) : (
                    <a href="/api/login">
                      <Button className="w-full gap-2" size="lg" data-testid="button-login-to-enroll">
                        Sign In to Enroll
                      </Button>
                    </a>
                  )}

                  <Separator className="my-6" />

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Full lifetime access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>AI-powered Q&A assistant</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Practice quizzes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-500" />
                      <span>Certificate of completion</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="lg:max-w-2xl">
          <h2 className="text-2xl font-semibold mb-6">Course Content</h2>

          <div className="text-sm text-muted-foreground mb-4">
            {course.sections?.length || 0} sections • {getTotalLessons()} lessons •{" "}
            {formatDuration(course.totalDuration || 0)} total
          </div>

          <Accordion type="multiple" className="space-y-2">
            {course.sections?.map((section, sectionIndex) => (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline" data-testid={`accordion-section-${section.id}`}>
                  <div className="flex items-center gap-3 text-left">
                    <span className="text-sm text-muted-foreground">
                      Section {sectionIndex + 1}
                    </span>
                    <span className="font-medium">{section.title}</span>
                    <Badge variant="outline" className="ml-auto mr-4">
                      {section.lessons?.length || 0} lessons
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {section.lessons?.map((lesson, lessonIndex) => (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-3 py-2 px-2 rounded hover:bg-muted"
                        data-testid={`lesson-item-${lesson.id}`}
                      >
                        <Play className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm">
                          {lessonIndex + 1}. {lesson.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {Math.floor((lesson.duration || 0) / 60)}:{((lesson.duration || 0) % 60)
                            .toString()
                            .padStart(2, "0")}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
