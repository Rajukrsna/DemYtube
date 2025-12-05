import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";

import Landing from "@/pages/Landing";
import Marketplace from "@/pages/Marketplace";
import Dashboard from "@/pages/Dashboard";
import CourseDetails from "@/pages/CourseDetails";
import CoursePlayer from "@/pages/CoursePlayer";
import CreateCourse from "@/pages/CreateCourse";
import MyCourses from "@/pages/MyCourses";
import AdminPanel from "@/pages/AdminPanel";
import Certificate from "@/pages/Certificate";
import CourseAnalytics from "@/pages/CourseAnalytics";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/course/:courseId" component={CourseDetails} />
          <Route path="/certificate/:certificateId" component={Certificate} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/course/:courseId" component={CourseDetails} />
          <Route path="/course/:courseId/analytics" component={CourseAnalytics} />
          <Route path="/learn/:courseId" component={CoursePlayer} />
          <Route path="/create-course" component={CreateCourse} />
          <Route path="/my-courses" component={MyCourses} />
          <Route path="/admin" component={AdminPanel} />
          <Route path="/certificate/:certificateId" component={Certificate} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Router />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
