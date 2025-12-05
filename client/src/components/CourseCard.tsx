import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Users, Clock } from "lucide-react";
import type { CourseWithInstructor } from "@shared/schema";

interface CourseCardProps {
  course: CourseWithInstructor;
}

export function CourseCard({ course }: CourseCardProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getInstructorInitials = () => {
    if (course.instructor?.firstName && course.instructor?.lastName) {
      return `${course.instructor.firstName[0]}${course.instructor.lastName[0]}`.toUpperCase();
    }
    return "IN";
  };

  const defaultThumbnail = `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=640&h=360&fit=crop`;

  return (
    <Link href={`/course/${course.id}`}>
      <Card className="group overflow-visible cursor-pointer transition-all duration-200 hover:shadow-lg" data-testid={`card-course-${course.id}`}>
        <div className="relative aspect-video overflow-hidden rounded-t-md">
          <img
            src={course.thumbnail || defaultThumbnail}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          <div className="absolute top-3 right-3">
            <Badge 
              variant={course.isFree ? "secondary" : "default"}
              className="backdrop-blur-sm"
            >
              {course.isFree ? "Free" : `$${course.price}`}
            </Badge>
          </div>
          
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
            <Avatar className="h-6 w-6 border-2 border-white">
              <AvatarImage src={course.instructor?.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">{getInstructorInitials()}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-white font-medium truncate">
              {course.instructor?.firstName} {course.instructor?.lastName}
            </span>
          </div>
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors" data-testid={`text-course-title-${course.id}`}>
            {course.title}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {course.description}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{course.enrollmentCount?.toLocaleString() || 0} students</span>
            </div>
            {course.totalDuration && course.totalDuration > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDuration(course.totalDuration)}</span>
              </div>
            )}
          </div>
          
          {course.tags && course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {course.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
