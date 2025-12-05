import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Users,
  BookOpen,
  Award,
  Loader2,
  Shield,
} from "lucide-react";
import type { CourseWithInstructor } from "@shared/schema";

export default function AdminPanel() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedCourse, setSelectedCourse] = useState<CourseWithInstructor | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

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
      return;
    }
    if (!authLoading && user?.role !== "admin") {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    }
  }, [isAuthenticated, authLoading, user, toast]);

  const { data: pendingCourses, isLoading: pendingLoading } = useQuery<CourseWithInstructor[]>({
    queryKey: ["/api/admin/courses", { status: "pending" }],
    enabled: user?.role === "admin",
  });

  const { data: approvedCourses, isLoading: approvedLoading } = useQuery<CourseWithInstructor[]>({
    queryKey: ["/api/admin/courses", { status: "approved" }],
    enabled: user?.role === "admin",
  });

  const { data: rejectedCourses, isLoading: rejectedLoading } = useQuery<CourseWithInstructor[]>({
    queryKey: ["/api/admin/courses", { status: "rejected" }],
    enabled: user?.role === "admin",
  });

  const { data: stats } = useQuery<{
    totalCourses: number;
    totalUsers: number;
    totalEnrollments: number;
    pendingReviews: number;
  }>({
    queryKey: ["/api/admin/stats"],
    enabled: user?.role === "admin",
  });

  const approveMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("POST", `/api/admin/courses/${courseId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses"] });
      toast({
        title: "Course Approved",
        description: "The course is now live on the marketplace!",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ courseId, feedback }: { courseId: string; feedback: string }) => {
      await apiRequest("POST", `/api/admin/courses/${courseId}/reject`, { feedback });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses"] });
      setRejectDialogOpen(false);
      setRejectFeedback("");
      setSelectedCourse(null);
      toast({
        title: "Course Rejected",
        description: "Feedback has been sent to the instructor.",
      });
    },
  });

  const getCoursesForTab = () => {
    switch (activeTab) {
      case "pending":
        return pendingCourses || [];
      case "approved":
        return approvedCourses || [];
      case "rejected":
        return rejectedCourses || [];
      default:
        return [];
    }
  };

  const isLoadingCourses = () => {
    switch (activeTab) {
      case "pending":
        return pendingLoading;
      case "approved":
        return approvedLoading;
      case "rejected":
        return rejectedLoading;
      default:
        return false;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>;
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

  if (authLoading || user?.role !== "admin") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin Panel</h1>
            <p className="text-muted-foreground">Manage courses and users</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card data-testid="card-stat-courses">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalCourses || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-users">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-enrollments">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <Award className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalEnrollments || 0}</p>
                  <p className="text-xs text-muted-foreground">Enrollments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-pending">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.pendingReviews || 0}</p>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Review Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Course Review Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending" className="gap-2" data-testid="tab-pending">
                  <Clock className="h-4 w-4" />
                  Pending ({pendingCourses?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2" data-testid="tab-approved">
                  <CheckCircle className="h-4 w-4" />
                  Approved ({approvedCourses?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2" data-testid="tab-rejected">
                  <XCircle className="h-4 w-4" />
                  Rejected ({rejectedCourses?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {isLoadingCourses() ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : getCoursesForTab().length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Thumbnail</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Instructor</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getCoursesForTab().map((course) => (
                        <TableRow key={course.id} data-testid={`row-course-${course.id}`}>
                          <TableCell>
                            <div className="w-16 h-10 rounded overflow-hidden bg-muted">
                              {course.thumbnail ? (
                                <img
                                  src={course.thumbnail}
                                  alt={course.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{course.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {course.sections?.reduce((t, s) => t + (s.lessons?.length || 0), 0) || 0} lessons
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {course.instructor?.firstName} {course.instructor?.lastName}
                            </p>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(course.createdAt)}
                          </TableCell>
                          <TableCell>{getStatusBadge(course.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedCourse(course);
                                  setPreviewDialogOpen(true);
                                }}
                                data-testid={`button-preview-${course.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {course.status === "pending" && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => approveMutation.mutate(course.id)}
                                    disabled={approveMutation.isPending}
                                    data-testid={`button-approve-${course.id}`}
                                  >
                                    {approveMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCourse(course);
                                      setRejectDialogOpen(true);
                                    }}
                                    data-testid={`button-reject-${course.id}`}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4" />
                    <p>No courses in this category</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Course</DialogTitle>
            <DialogDescription>
              Provide feedback for why this course is being rejected.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter feedback for the instructor..."
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
            rows={4}
            data-testid="textarea-reject-feedback"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedCourse) {
                  rejectMutation.mutate({
                    courseId: selectedCourse.id,
                    feedback: rejectFeedback,
                  });
                }
              }}
              disabled={!rejectFeedback.trim() || rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedCourse?.title}</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4">
              {selectedCourse.thumbnail && (
                <div className="aspect-video rounded-lg overflow-hidden">
                  <img
                    src={selectedCourse.thumbnail}
                    alt={selectedCourse.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <h4 className="font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedCourse.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Price:</span>{" "}
                  <span className="font-medium">
                    {selectedCourse.isFree ? "Free" : `$${selectedCourse.price}`}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Sections:</span>{" "}
                  <span className="font-medium">{selectedCourse.sections?.length || 0}</span>
                </div>
              </div>
              {selectedCourse.rejectionFeedback && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <h4 className="font-medium text-destructive mb-1">Rejection Feedback</h4>
                  <p className="text-sm">{selectedCourse.rejectionFeedback}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
