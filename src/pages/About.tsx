import { BlogHeader } from "@/components/BlogHeader";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/ContactForm";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/PageTitle";
import { useEffect, Suspense } from "react";
import { PageLayout } from '@/components/PageLayout';
import { Github } from "lucide-react";

const LoadingState = () => (
  <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
    <BlogHeader />
    <main className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
      <PageTitle>About Me</PageTitle>
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-accent1/10 rounded w-3/4"></div>
        <div className="h-4 bg-accent1/10 rounded w-1/2"></div>
        <div className="h-4 bg-accent1/10 rounded w-2/3"></div>
      </div>
    </main>
  </div>
);

const ErrorState = ({ error }: { error: Error }) => (
  <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
    <BlogHeader />
    <main className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
      <PageTitle>About Me</PageTitle>
      <div className="p-4 rounded bg-red-500/10 text-red-500 border border-red-500/20">
        <p className="font-medium">Error loading content. Please try refreshing the page.</p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-2 text-sm overflow-auto">
            {error.message}
          </pre>
        )}
      </div>
    </main>
  </div>
);

const MainContent = ({ content }: { content: string }) => (
  <PageLayout>
    <PageTitle>About Me</PageTitle>
    <div className="space-y-6">
      <InlineEdit
        content={content}
        pageName="about"
        className="text-lg md:text-base leading-relaxed text-white/90"
      />
      <div className="flex flex-wrap gap-4">
        <Button
          variant="outline"
          className="bg-accent1/10 hover:bg-accent1/20 border-accent1/50 text-white w-[140px] h-10"
          asChild
        >
          <a
            href="https://www.linkedin.com/in/vladsec"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </Button>
        <ContactForm />
        <Button
          variant="outline"
          className="bg-accent1/10 hover:bg-accent1/20 border-accent1/50 text-white w-[140px] h-10"
          asChild
        >
          <a
            href="https://github.com/Hornfisk/vladsblog"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="mr-2 h-4 w-4" />
            Steal This
          </a>
        </Button>
      </div>
    </div>
  </PageLayout>
);

const About = () => {
  const { data: pageContent, isLoading, error } = useQuery({
    queryKey: ['page-content', 'about'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_content')
        .select('content')
        .eq('page_name', 'about')
        .maybeSingle();

      if (error) throw error;

      return data?.content || "A cybersecurity enthusiast and cloud infrastructure specialist with a passion for building secure, scalable systems. I specialize in penetration testing, cloud security architecture, and developing robust security solutions. When I'm not breaking (or fixing) things, I'm probably writing about it here or contributing to open-source security tools.";
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error as Error} />;
  }

  return (
    <Suspense fallback={<LoadingState />}>
      <MainContent content={pageContent || ""} />
    </Suspense>
  );
};

export default About;
