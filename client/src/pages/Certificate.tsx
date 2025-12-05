import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Download, Share2, ArrowLeft, CheckCircle } from "lucide-react";
import type { Certificate } from "@shared/schema";

export default function CertificatePage() {
  const [, params] = useRoute("/certificate/:certificateId");
  const certificateId = params?.certificateId;

  const { data: certificate, isLoading } = useQuery<Certificate>({
    queryKey: ["/api/certificates", certificateId],
    enabled: !!certificateId,
  });

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/certificates/${certificateId}/pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${certificate?.uniqueId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download certificate:", error);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/certificate/${certificateId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate of Completion - ${certificate?.courseName}`,
          text: `I completed "${certificate?.courseName}" on LearnTube!`,
          url: shareUrl,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Skeleton className="w-full max-w-3xl h-[500px]" />
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Certificate not found</h2>
          <p className="text-muted-foreground mb-6">
            This certificate may have been removed or doesn't exist.
          </p>
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6 gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Certificate Card */}
        <Card className="overflow-hidden" data-testid="card-certificate">
          <div className="relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
            <div className="absolute inset-0 opacity-5">
              <svg width="100%" height="100%">
                <pattern id="cert-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="20" cy="20" r="1" fill="currentColor" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#cert-pattern)" />
              </svg>
            </div>

            <CardContent className="relative p-8 md:p-12">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                  <Award className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Certificate of Completion</h1>
                <p className="text-muted-foreground">LearnTube Online Learning Platform</p>
              </div>

              {/* Certificate Content */}
              <div className="text-center space-y-6 py-8 border-y">
                <p className="text-lg text-muted-foreground">This is to certify that</p>
                <p className="text-2xl md:text-3xl font-bold text-primary">
                  {certificate.userName || "Learner"}
                </p>
                <p className="text-lg text-muted-foreground">has successfully completed the course</p>
                <p className="text-xl md:text-2xl font-semibold">
                  "{certificate.courseName}"
                </p>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Completed on {formatDate(certificate.issuedAt)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
                <div className="text-center md:text-left">
                  <p className="text-xs text-muted-foreground">Certificate ID</p>
                  <p className="font-mono text-sm">{certificate.uniqueId}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Verify at</p>
                  <p className="text-sm">{window.location.origin}/certificate/{certificateId}</p>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-xs text-muted-foreground">Issue Date</p>
                  <p className="text-sm font-medium">{formatDate(certificate.issuedAt)}</p>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Button onClick={handleDownload} className="gap-2 w-full sm:w-auto" data-testid="button-download">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={handleShare} className="gap-2 w-full sm:w-auto" data-testid="button-share">
            <Share2 className="h-4 w-4" />
            Share Certificate
          </Button>
        </div>
      </div>
    </div>
  );
}
