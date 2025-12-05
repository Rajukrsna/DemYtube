import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Users,
  Eye,
  CheckCircle,
  TrendingUp,
  Clock,
  BookOpen,
} from "lucide-react";
import type { CourseWithInstructor } from "@shared/schema";

interface CourseAnalytics {
  totalEnrollments: number;
  totalViews: number;
  completionRate: number;
  averageProgress: number;
  totalWatchTime: number;
  recentEnrollments: Array<{
    date: string;
    count: number;
  }>;
}

export default function CourseAnalyticsPage() {
  const [, params] = useRoute("/course/:courseId/analytics");
  const courseId = params?.courseId;
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

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithInstructor>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<CourseAnalytics>({
    queryKey: ["/api/courses", courseId, "analytics"],
    enabled: !!courseId && isAuthenticated,
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (authLoading || courseLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Course not found</h2>
          <Link href="/my-courses">
            <Button>Back to My Courses</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <Link href="/my-courses">
          <Button variant="ghost" className="mb-6 gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to My Courses
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-analytics-title">
            Course Analytics
          </h1>
          <p className="text-muted-foreground">{course.title}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card data-testid="card-stat-enrollments">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {analytics?.totalEnrollments || course.enrollmentCount || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-views">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-500/10">
                  <Eye className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {analytics?.totalViews || course.viewCount || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-completion">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {Math.round(analytics?.completionRate || 0)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-progress">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/10">
                  <TrendingUp className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {Math.round(analytics?.averageProgress || 0)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Avg. Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Watch Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2">
                {formatDuration(analytics?.totalWatchTime || 0)}
              </div>
              <p className="text-sm text-muted-foreground">
                Total time students have spent watching your content
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sections</span>
                  <span className="font-medium">{course.sections?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Lessons</span>
                  <span className="font-medium">
                    {course.sections?.reduce((t, s) => t + (s.lessons?.length || 0), 0) || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Duration</span>
                  <span className="font-medium">{formatDuration(course.totalDuration || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Student Progress Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Just Started (0-25%)</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((analytics?.totalEnrollments || 0) * 0.3)} students
                  </span>
                </div>
                <Progress value={30} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">In Progress (25-75%)</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((analytics?.totalEnrollments || 0) * 0.45)} students
                  </span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Almost Done (75-99%)</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((analytics?.totalEnrollments || 0) * 0.15)} students
                  </span>
                </div>
                <Progress value={15} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Completed (100%)</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((analytics?.totalEnrollments || 0) * 0.1)} students
                  </span>
                </div>
                <Progress value={10} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
