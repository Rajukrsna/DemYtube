import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  BarChart,
  Users,
  Eye,
} from "lucide-react";
import type { CourseWithInstructor } from "@shared/schema";

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

function CircularProgress({ percentage, size = 60, strokeWidth = 4 }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-300"
        />
      </svg>
      <span className="absolute text-xs font-semibold">{percentage}%</span>
    </div>
  );
}

export default function MyCourses() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

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

  const { data: courses, isLoading } = useQuery<CourseWithInstructor[]>({
    queryKey: ["/api/courses/my"],
    enabled: isAuthenticated,
  });

  const { data: enrollments } = useQuery<any[]>({
    queryKey: ["/api/enrollments/my"],
    enabled: isAuthenticated,
  });

  // Map course progress from enrollments
  const courseProgress = new Map(
    enrollments?.map(e => [e.courseId, e.progressPercent || 0]) || []
  );

  const draftCourses = courses?.filter((c) => c.status === "draft") || [];
  const pendingCourses = courses?.filter((c) => c.status === "pending") || [];
  const approvedCourses = courses?.filter((c) => c.status === "approved") || [];
  const rejectedCourses = courses?.filter((c) => c.status === "rejected") || [];
  const freeCourses = courses?.filter((c) => !c.isPublic) || [];
  const marketplaceCourses = courses?.filter((c) => c.isPublic && c.status === "approved") || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary" className="gap-1"><Edit className="h-3 w-3" />Draft</Badge>;
      case "pending":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending Review</Badge>;
      case "approved":
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" />Published</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderCourseCard = (course: CourseWithInstructor) => (
    <Card key={course.id} className="overflow-visible" data-testid={`card-my-course-${course.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-24 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold truncate">{course.title}</h3>
              {getStatusBadge(course.status)}
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
              {course.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {course.sections?.reduce((t, s) => t + (s.lessons?.length || 0), 0) || 0} lessons
              </span>
              {course.status === "approved" && (
                <>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {course.enrollmentCount || 0} students
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {course.viewCount || 0} views
                  </span>
                </>
              )}
              <span>Created {formatDate(course.createdAt)}</span>
            </div>

            {course.status === "rejected" && course.rejectionFeedback && (
              <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
                <p className="font-medium text-destructive text-xs">Rejection Reason:</p>
                <p className="text-xs mt-1">{course.rejectionFeedback}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center px-4">
            <CircularProgress percentage={courseProgress.get(course.id) || 0} />
          </div>

          <div className="flex flex-col gap-2">
            {course.isPublic && course.status === "approved" && (
              <Link href={`/course/${course.id}/analytics`}>
                <Button variant="outline" size="sm" className="gap-1" data-testid={`button-analytics-${course.id}`}>
                  <BarChart className="h-4 w-4" />
                  Analytics
                </Button>
              </Link>
            )}
            <Link href={`/course/${course.id}`}>
              <Button variant="ghost" size="sm" className="gap-1" data-testid={`button-view-${course.id}`}>
                <Eye className="h-4 w-4" />
                View
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-my-courses-title">My Courses</h1>
            <p className="text-muted-foreground">Manage your created courses</p>
          </div>
          <Link href="/create-course">
            <Button className="gap-2" data-testid="button-create-new-course">
              <Plus className="h-4 w-4" />
              Create New Course
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : courses && courses.length > 0 ? (
          <Tabs defaultValue="all">
            <TabsList className="mb-6">
              <TabsTrigger value="all" data-testid="tab-all">
                All ({courses.length})
              </TabsTrigger>
              <TabsTrigger value="free" data-testid="tab-free">
                Free ({freeCourses.length})
              </TabsTrigger>
              <TabsTrigger value="marketplace" data-testid="tab-marketplace">
                Published to Marketplace ({marketplaceCourses.length})
              </TabsTrigger>
              <TabsTrigger value="pending" data-testid="tab-pending">
                Pending Review ({pendingCourses.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" data-testid="tab-rejected">
                Rejected ({rejectedCourses.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {courses.map(renderCourseCard)}
            </TabsContent>

            <TabsContent value="free" className="space-y-4">
              {freeCourses.length > 0 ? (
                freeCourses.map(renderCourseCard)
              ) : (
                <Card className="p-8 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No personal courses yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create courses for your personal use
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="marketplace" className="space-y-4">
              {marketplaceCourses.length > 0 ? (
                marketplaceCourses.map(renderCourseCard)
              ) : (
                <Card className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No courses published to marketplace</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Submit courses for marketplace approval to reach more students
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {pendingCourses.length > 0 ? (
                pendingCourses.map(renderCourseCard)
              ) : (
                <Card className="p-8 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No courses pending review</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              {rejectedCourses.length > 0 ? (
                rejectedCourses.map(renderCourseCard)
              ) : (
                <Card className="p-8 text-center">
                  <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No rejected courses</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="p-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No courses yet</h2>
            <p className="text-muted-foreground mb-6">
              Start creating your first course and share your knowledge
            </p>
            <Link href="/create-course">
              <Button data-testid="button-create-first-course">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Course
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
