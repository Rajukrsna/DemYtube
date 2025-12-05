import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Plus,
  Trash2,
  GripVertical,
  Youtube,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Image as ImageIcon,
  X,
  Sparkles,
} from "lucide-react";

const courseFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  thumbnail: z.string().url().optional().or(z.literal("")),
  price: z.string().optional(),
  isFree: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;

interface VideoInput {
  id: string;
  url: string;
  title: string;
  duration: number;
  videoId: string;
}

interface SectionInput {
  id: string;
  title: string;
  lessons: VideoInput[];
}

const STEPS = ["Add Videos", "Course Details", "Organize", "Review"];

export default function CreateCourse() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [videos, setVideos] = useState<VideoInput[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [sections, setSections] = useState<SectionInput[]>([
    { id: crypto.randomUUID(), title: "Section 1", lessons: [] },
  ]);
  const [tagInput, setTagInput] = useState("");

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

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: "",
      description: "",
      thumbnail: "",
      price: "0",
      isFree: true,
      tags: [],
    },
  });

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const addVideoMutation = useMutation({
    mutationFn: async (url: string) => {
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }
      const response = await apiRequest("POST", "/api/youtube/info", { videoId });
      return response.json();
    },
    onSuccess: (data) => {
      const newVideo: VideoInput = {
        id: crypto.randomUUID(),
        url: videoUrl,
        title: data.title || "Untitled Video",
        duration: data.duration || 0,
        videoId: data.videoId,
      };
      setVideos([...videos, newVideo]);
      setVideoUrl("");
      toast({
        title: "Video Added",
        description: `"${newVideo.title}" has been added`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add video",
        description: error.message || "Please check the URL and try again",
        variant: "destructive",
      });
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (values: CourseFormValues) => {
      const courseData = {
        ...values,
        sections: sections.map((section, sIndex) => ({
          title: section.title,
          order: sIndex,
          lessons: section.lessons.map((lesson, lIndex) => ({
            title: lesson.title,
            youtubeUrl: lesson.url,
            youtubeVideoId: lesson.videoId,
            duration: lesson.duration,
            order: lIndex,
          })),
        })),
      };
      const response = await apiRequest("POST", "/api/courses", courseData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Course Created",
        description: "Your course has been submitted for review!",
      });
      setLocation(`/my-courses`);
    },
    onError: (error) => {
      toast({
        title: "Failed to create course",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (videoUrl.trim()) {
      addVideoMutation.mutate(videoUrl.trim());
    }
  };

  const handleRemoveVideo = (id: string) => {
    setVideos(videos.filter((v) => v.id !== id));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !form.getValues("tags").includes(tagInput.trim())) {
      form.setValue("tags", [...form.getValues("tags"), tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    form.setValue(
      "tags",
      form.getValues("tags").filter((t) => t !== tag)
    );
  };

  const handleAddSection = () => {
    setSections([
      ...sections,
      { id: crypto.randomUUID(), title: `Section ${sections.length + 1}`, lessons: [] },
    ]);
  };

  const handleRemoveSection = (id: string) => {
    if (sections.length > 1) {
      setSections(sections.filter((s) => s.id !== id));
    }
  };

  const handleUpdateSectionTitle = (id: string, title: string) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, title } : s)));
  };

  const handleAssignToSection = (videoId: string, sectionId: string) => {
    const video = videos.find((v) => v.id === videoId);
    if (!video) return;

    setSections(
      sections.map((section) => {
        if (section.id === sectionId) {
          if (!section.lessons.find((l) => l.id === videoId)) {
            return { ...section, lessons: [...section.lessons, video] };
          }
        } else {
          return { ...section, lessons: section.lessons.filter((l) => l.id !== videoId) };
        }
        return section;
      })
    );
  };

  const handleAutoOrganize = () => {
    if (videos.length === 0) return;
    
    const organized: SectionInput[] = [
      {
        id: crypto.randomUUID(),
        title: "Course Content",
        lessons: [...videos],
      },
    ];
    setSections(organized);
    toast({
      title: "Videos Organized",
      description: "All videos have been added to a single section",
    });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return videos.length > 0;
      case 1:
        return form.formState.isValid;
      case 2:
        return sections.some((s) => s.lessons.length > 0);
      case 3:
        return true;
      default:
        return false;
    }
  };

  const getTotalLessons = () => {
    return sections.reduce((total, section) => total + section.lessons.length, 0);
  };

  const getTotalDuration = () => {
    const seconds = sections.reduce(
      (total, section) =>
        total + section.lessons.reduce((t, l) => t + l.duration, 0),
      0
    );
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const onSubmit = (values: CourseFormValues) => {
    createCourseMutation.mutate(values);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-create-course-title">
            Create a New Course
          </h1>
          <p className="text-muted-foreground">
            Build your course from YouTube videos in just a few steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index < currentStep
                      ? "bg-primary text-primary-foreground"
                      : index === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-full h-1 mx-2 ${
                      index < currentStep ? "bg-primary" : "bg-muted"
                    }`}
                    style={{ width: "60px" }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {STEPS.map((step, index) => (
              <span
                key={step}
                className={`text-xs ${
                  index === currentStep ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Step 1: Add Videos */}
            {currentStep === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Youtube className="h-5 w-5" />
                    Add YouTube Videos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste YouTube URL (e.g., https://youtube.com/watch?v=...)"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      data-testid="input-video-url"
                    />
                    <Button
                      type="button"
                      onClick={handleAddVideo}
                      disabled={!videoUrl.trim() || addVideoMutation.isPending}
                      data-testid="button-add-video"
                    >
                      {addVideoMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {videos.length > 0 ? (
                    <div className="space-y-2">
                      {videos.map((video, index) => (
                        <div
                          key={video.id}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                          data-testid={`video-item-${index}`}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          <div className="w-20 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">{video.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.floor(video.duration / 60)}:{(video.duration % 60)
                                .toString()
                                .padStart(2, "0")}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveVideo(video.id)}
                            data-testid={`button-remove-video-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <Youtube className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No videos added yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add YouTube videos to create your course
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Course Details */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Course Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Complete Web Development Bootcamp"
                            {...field}
                            data-testid="input-course-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what students will learn..."
                            rows={4}
                            {...field}
                            data-testid="input-course-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="thumbnail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thumbnail URL (optional)</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://example.com/image.jpg"
                              {...field}
                              data-testid="input-thumbnail"
                            />
                            {field.value && (
                              <div className="w-20 h-12 rounded overflow-hidden flex-shrink-0">
                                <img
                                  src={field.value}
                                  alt="Thumbnail preview"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          Leave empty to use first video thumbnail
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="isFree"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel className="text-base">Free Course</FormLabel>
                            <FormDescription>
                              Make this course available for free
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-free-course"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {!form.watch("isFree") && (
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (USD)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="29.99"
                                {...field}
                                data-testid="input-price"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div>
                    <FormLabel>Tags</FormLabel>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Add a tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        data-testid="input-tag"
                      />
                      <Button type="button" onClick={handleAddTag} variant="outline">
                        Add
                      </Button>
                    </div>
                    {form.watch("tags").length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {form.watch("tags").map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Organize Sections */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Organize Sections</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAutoOrganize}
                        className="gap-2"
                        data-testid="button-auto-organize"
                      >
                        <Sparkles className="h-4 w-4" />
                        Auto-Organize
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddSection}
                        data-testid="button-add-section"
                      >
                        <Plus className="h-4 w-4" />
                        Add Section
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sections.map((section, sIndex) => (
                    <div key={section.id} className="border rounded-lg p-4" data-testid={`section-${sIndex}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <Input
                          value={section.title}
                          onChange={(e) => handleUpdateSectionTitle(section.id, e.target.value)}
                          className="font-medium"
                          data-testid={`input-section-title-${sIndex}`}
                        />
                        {sections.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSection(section.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {section.lessons.length > 0 ? (
                          section.lessons.map((lesson, lIndex) => (
                            <div
                              key={lesson.id}
                              className="flex items-center gap-2 p-2 bg-muted rounded"
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm flex-1 truncate">{lesson.title}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setSections(
                                    sections.map((s) =>
                                      s.id === section.id
                                        ? {
                                            ...s,
                                            lessons: s.lessons.filter((l) => l.id !== lesson.id),
                                          }
                                        : s
                                    )
                                  )
                                }
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Drop videos here
                          </p>
                        )}
                      </div>

                      {videos.filter((v) => !section.lessons.find((l) => l.id === v.id)).length >
                        0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs text-muted-foreground mb-2">Available videos:</p>
                          <div className="flex flex-wrap gap-2">
                            {videos
                              .filter(
                                (v) =>
                                  !sections.some((s) => s.lessons.find((l) => l.id === v.id))
                              )
                              .map((video) => (
                                <Button
                                  key={video.id}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAssignToSection(video.id, section.id)}
                                  className="text-xs"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  {video.title.slice(0, 30)}...
                                </Button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Step 4: Review */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Your Course</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-2">Course Details</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Title:</span>{" "}
                          <span className="font-medium">{form.watch("title")}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Price:</span>{" "}
                          <span className="font-medium">
                            {form.watch("isFree") ? "Free" : `$${form.watch("price")}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tags:</span>{" "}
                          <span className="font-medium">
                            {form.watch("tags").join(", ") || "None"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Content Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Sections:</span>{" "}
                          <span className="font-medium">{sections.length}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Lessons:</span>{" "}
                          <span className="font-medium">{getTotalLessons()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Duration:</span>{" "}
                          <span className="font-medium">{getTotalDuration()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{form.watch("description")}</p>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Course Structure</h3>
                    <div className="space-y-2">
                      {sections.map((section, index) => (
                        <div key={section.id} className="border rounded p-3">
                          <p className="font-medium text-sm">
                            Section {index + 1}: {section.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {section.lessons.length} lessons
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm">
                      <strong>Note:</strong> Your course will be submitted for review before it
                      becomes publicly available. You'll be notified once it's approved.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
                data-testid="button-back"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  data-testid="button-next"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createCourseMutation.isPending || !canProceed()}
                  data-testid="button-submit-course"
                >
                  {createCourseMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Submit for Review
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
