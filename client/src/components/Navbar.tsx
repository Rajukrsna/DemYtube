import { Link, useLocation } from "wouter";
import { SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { Search, Plus, Moon, Sun, GraduationCap } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/marketplace?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-semibold hidden sm:block" data-testid="text-brand-name">LearnTube</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/marketplace">
              <Button variant="ghost" size="sm" data-testid="link-marketplace">
                Browse Courses
              </Button>
            </Link>
            {isAuthenticated && (
              <Link href="/my-courses">
                <Button variant="ghost" size="sm" data-testid="link-my-courses">
                  My Courses
                </Button>
              </Link>
            )}
          </nav>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
              data-testid="input-search"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {isLoading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : isAuthenticated && user ? (
            <>
              <Link href="/create-course">
                <Button variant="outline" size="sm" className="hidden sm:flex gap-2" data-testid="button-create-course">
                  <Plus className="h-4 w-4" />
                  Create Course
                </Button>
              </Link>
              
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9",
                  },
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="Dashboard"
                    labelIcon={<GraduationCap className="h-4 w-4" />}
                    href="/dashboard"
                  />
                  <UserButton.Link
                    label="My Courses"
                    labelIcon={<Plus className="h-4 w-4" />}
                    href="/my-courses"
                  />
                  {user.role === "admin" && (
                    <UserButton.Link
                      label="Admin Panel"
                      labelIcon={<span className="h-4 w-4">🛡️</span>}
                      href="/admin"
                    />
                  )}
                </UserButton.MenuItems>
              </UserButton>
            </>
          ) : (
            <div className="flex gap-2">
              <SignInButton mode="modal">
                <Button variant="ghost" data-testid="button-signin">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button data-testid="button-signup">Sign Up</Button>
              </SignUpButton>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
