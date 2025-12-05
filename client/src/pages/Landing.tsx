import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  Search, 
  Play, 
  BookOpen, 
  Award, 
  Users, 
  ArrowRight,
  Code,
  Palette,
  TrendingUp,
  Camera,
  Music,
  Brain
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CourseCard } from "@/components/CourseCard";
import type { CourseWithInstructor } from "@shared/schema";

const categories = [
  { name: "Development", icon: Code, color: "bg-blue-500/10 text-blue-500" },
  { name: "Design", icon: Palette, color: "bg-purple-500/10 text-purple-500" },
  { name: "Business", icon: TrendingUp, color: "bg-green-500/10 text-green-500" },
  { name: "Photography", icon: Camera, color: "bg-orange-500/10 text-orange-500" },
  { name: "Music", icon: Music, color: "bg-pink-500/10 text-pink-500" },
  { name: "AI & ML", icon: Brain, color: "bg-cyan-500/10 text-cyan-500" },
];

export default function Landing() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: featuredCourses } = useQuery<CourseWithInstructor[]>({
    queryKey: ["/api/courses"],
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/marketplace?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMjIiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              Transform YouTube into Learning
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6" data-testid="text-hero-title">
              Turn YouTube Videos Into
              <span className="text-primary block mt-2">Complete Courses</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create structured learning experiences from any YouTube content. 
              Add AI-powered quizzes, track progress, and earn certificates.
            </p>
            
            <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="What do you want to learn?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-32 h-14 text-lg rounded-full border-2"
                  data-testid="input-hero-search"
                />
                <Button 
                  type="submit" 
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                  data-testid="button-hero-search"
                >
                  Search
                </Button>
              </div>
            </form>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/marketplace">
                <Button size="lg" className="gap-2" data-testid="button-explore-courses">
                  <BookOpen className="h-5 w-5" />
                  Explore Courses
                </Button>
              </Link>
              <a href="/api/login">
                <Button size="lg" variant="outline" className="gap-2" data-testid="button-start-teaching">
                  <Play className="h-5 w-5" />
                  Start Teaching
                </Button>
              </a>
            </div>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <span className="text-sm font-medium">1,000+ Courses</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">50,000+ Learners</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                <span className="text-sm font-medium">Verified Certificates</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">Popular Categories</h2>
            <p className="text-muted-foreground">Explore courses across various topics</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link key={category.name} href={`/marketplace?tag=${encodeURIComponent(category.name)}`}>
                <Card className="group cursor-pointer transition-all hover:shadow-md overflow-visible" data-testid={`card-category-${category.name.toLowerCase()}`}>
                  <CardContent className="p-6 text-center">
                    <div className={`inline-flex p-4 rounded-full mb-4 ${category.color}`}>
                      <category.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-medium text-sm">{category.name}</h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-2">Featured Courses</h2>
              <p className="text-muted-foreground">Hand-picked courses for you</p>
            </div>
            <Link href="/marketplace">
              <Button variant="ghost" className="gap-2" data-testid="link-view-all-courses">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          {featuredCourses && featuredCourses.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-6">Be the first to create a course!</p>
              <a href="/api/login">
                <Button data-testid="button-create-first-course">Create Your First Course</Button>
              </a>
            </Card>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Create and learn in three simple steps</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="relative overflow-visible">
              <div className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <CardContent className="pt-8 p-6">
                <h3 className="font-semibold text-lg mb-2">Add YouTube Videos</h3>
                <p className="text-muted-foreground text-sm">
                  Paste YouTube URLs to build your course content. Our AI extracts transcripts automatically.
                </p>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-visible">
              <div className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <CardContent className="pt-8 p-6">
                <h3 className="font-semibold text-lg mb-2">Organize & Enhance</h3>
                <p className="text-muted-foreground text-sm">
                  Structure content into sections, generate practice quizzes, and add AI-powered Q&A.
                </p>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-visible">
              <div className="absolute -top-4 left-6 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <CardContent className="pt-8 p-6">
                <h3 className="font-semibold text-lg mb-2">Publish & Earn</h3>
                <p className="text-muted-foreground text-sm">
                  Submit for review, get approved, and start selling. Learners earn certificates on completion.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Learning?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of learners and instructors on our platform
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/api/login">
              <Button size="lg" className="gap-2" data-testid="button-cta-get-started">
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </a>
            <Link href="/marketplace">
              <Button size="lg" variant="outline" data-testid="button-cta-browse">
                Browse Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="font-semibold">LearnTube</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Transform YouTube videos into complete learning experiences
            </p>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/marketplace" className="hover:text-foreground transition-colors">Courses</Link>
              <span>|</span>
              <a href="/api/login" className="hover:text-foreground transition-colors">Sign In</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
