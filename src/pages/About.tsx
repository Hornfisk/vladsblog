
import { useEffect } from "react";
import { BlogHeader } from "@/components/BlogHeader";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/PageTitle";
import { Suspense } from "react";
import { PageLayout } from '@/components/PageLayout';
import { setPageMeta, setCanonical } from "@/lib/seo";

const LoadingState = () => (
  <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
    <BlogHeader />
    <main className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
      <PageTitle>whoami</PageTitle>
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
      <PageTitle>whoami</PageTitle>
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
    <PageTitle>whoami</PageTitle>
    <div className="space-y-6">
      <InlineEdit
        content={content}
        pageName="about"
        className="text-lg md:text-base leading-relaxed text-white/90"
      />
    </div>
  </PageLayout>
);

const About = () => {
  useEffect(() => {
    setPageMeta({
      title: "whoami | vlads.blog",
      description: "vlad. cybersecurity, AI, linux. I build audio plugins (Hyperfocus DSP) because I make techno (REXIST) and the tools I wanted didn't exist.",
      path: "/about",
    });
    return () => {
      document.title = "vlads.blog";
      setCanonical("/");
    };
  }, []);

  const { data: pageContent, isLoading, error } = useQuery({
    queryKey: ['page-content', 'about'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_content')
        .select('content')
        .eq('page_name', 'about')
        .maybeSingle();

      if (error) throw error;

      return data?.content || "I'm Vlad. I write about cybersecurity, AI, and the linux systems I run. I also build audio plugins as Hyperfocus DSP — mostly because I make techno as REXIST, and at some point making my own tools became cheaper than buying them. this is where the long version lives.\n\nMost of what I ship is open source. The plugins and the blog itself are vibe-coded — Claude Code in the loop, me steering — and the source is the receipt. If a post is interesting, the repo is usually one click away.\n\nI post when I have something to say. No newsletter, no signup wall. If you want to follow along, the RSS feed is at `/rss.xml`.";
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
