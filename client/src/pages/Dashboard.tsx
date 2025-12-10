import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BookOpen, 
  Award, 
  Clock, 
  CheckCircle, 
  Play,
  GraduationCap,
  ArrowRight,
  PlusCircle
} from "lucide-react";
import type { EnrollmentWithCourse, Certificate } from "@shared/schema";

export default function Dashboard() {
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

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<EnrollmentWithCourse[]>({
    queryKey: ["/api/enrollments/my"],
    enabled: isAuthenticated,
  });

  const { data: certificates, isLoading: certificatesLoading } = useQuery<Certificate[]>({
    queryKey: ["/api/certificates/my"],
    enabled: isAuthenticated,
  });

  const { data: myCourses } = useQuery<any[]>({
    queryKey: ["/api/courses/my"],
    enabled: isAuthenticated,
  });

  const { data: watchTimeData } = useQuery<{ totalSeconds: number }>({
    queryKey: ["/api/users/watch-time"],
    enabled: isAuthenticated,
  });

  const totalHoursWatched = Math.floor((watchTimeData?.totalSeconds || 0) / 3600);

  const stats = {
    enrolled: enrollments?.length || 0,
    completed: enrollments?.filter((e) => e.completedAt)?.length || 0,
    hoursWatched: totalHoursWatched,
    certificates: certificates?.length || 0,
    coursesCreated: myCourses?.length || 0,
  };

  const inProgressCourses = enrollments?.filter((e) => !e.completedAt) || [];
  const completedCourses = enrollments?.filter((e) => e.completedAt) || [];

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-dashboard-title">
            My Learnings
          </h1>
          <p className="text-muted-foreground">
            Track your progress and continue learning
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 mb-8">
          <Card data-testid="card-stat-enrolled">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stats.enrolled}</p>
                  <p className="text-sm text-muted-foreground">Enrolled Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-created">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-500/10">
                  <PlusCircle className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stats.coursesCreated}</p>
                  <p className="text-sm text-muted-foreground">Courses Created</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-completed">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/10">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-hours">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stats.hoursWatched}</p>
                  <p className="text-sm text-muted-foreground">Hours Watched</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-certificates">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Award className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stats.certificates}</p>
                  <p className="text-sm text-muted-foreground">Certificates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* In Progress Courses */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Continue Learning</h2>
            {inProgressCourses.length > 3 && (
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {enrollmentsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : inProgressCourses.length > 0 ? (
            <div className="space-y-4">
              {inProgressCourses.slice(0, 5).map((enrollment) => (
                <Card key={enrollment.id} data-testid={`card-progress-${enrollment.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-16 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                        {enrollment.course?.thumbnail ? (
                          <img
                            src={enrollment.course.thumbnail}
                            alt={enrollment.course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <GraduationCap className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{enrollment.course?.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={enrollment.progressPercent || 0} className="h-2 flex-1" />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {enrollment.progressPercent || 0}%
                          </span>
                        </div>
                      </div>

                      <Link href={`/learn/${enrollment.courseId}`}>
                        <Button size="sm" className="gap-2" data-testid={`button-continue-${enrollment.id}`}>
                          <Play className="h-4 w-4" />
                          Continue
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">No courses in progress</h3>
              <p className="text-muted-foreground mb-4">Start your learning journey today</p>
              <Link href="/marketplace">
                <Button data-testid="button-browse-courses">Browse Courses</Button>
              </Link>
            </Card>
          )}
        </section>

        {/* Completed Courses */}
        {completedCourses.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Completed Courses</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedCourses.map((enrollment) => (
                <Card key={enrollment.id} data-testid={`card-completed-${enrollment.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0 bg-muted">
                        {enrollment.course?.thumbnail ? (
                          <img
                            src={enrollment.course.thumbnail}
                            alt={enrollment.course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{enrollment.course?.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Certificates */}
        {certificates && certificates.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">My Certificates</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {certificates.map((cert) => (
                <Card key={cert.id} className="overflow-visible" data-testid={`card-certificate-${cert.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-amber-500/10 flex-shrink-0">
                        <Award className="h-6 w-6 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{cert.courseName}</h4>
                        <p className="text-xs text-muted-foreground">
                          Issued {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <Link href={`/certificate/${cert.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-view-cert-${cert.id}`}>
                          View
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
