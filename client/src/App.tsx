import { Switch, Route } from "wouter";
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/Navbar";
import { setAuthTokenGetter } from "@/lib/api";
import { useEffect } from "react";

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
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={user ? Dashboard : Landing} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/dashboard" component={user ? Dashboard : Landing} />
      <Route path="/course/:courseId" component={CourseDetails} />
      <Route path="/course/:courseId/analytics" component={user ? CourseAnalytics : Landing} />
      <Route path="/learn/:courseId" component={user ? CoursePlayer : Landing} />
      <Route path="/create-course" component={user ? CreateCourse : Landing} />
      <Route path="/my-courses" component={user ? MyCourses : Landing} />
      <Route path="/admin" component={user ? AdminPanel : Landing} />
      <Route path="/certificate/:certificateId" component={Certificate} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { getToken } = useClerkAuth();
  
  // Set up global auth token getter - use "neon" JWT template for direct DB auth
  useEffect(() => {
    setAuthTokenGetter(() => getToken({ template: "neonDemy" }));
  }, [getToken]);

  return (
    <ThemeProvider>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main>
            <Router />
          </main>
          <Toaster />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
