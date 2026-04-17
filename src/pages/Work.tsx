import { useEffect, Suspense } from "react";
import { BlogHeader } from "@/components/BlogHeader";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/PageTitle";
import { PageLayout } from "@/components/PageLayout";

const LoadingState = () => (
  <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
    <BlogHeader />
    <main className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
      <PageTitle>work</PageTitle>
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
      <PageTitle>work</PageTitle>
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
    <PageTitle>work</PageTitle>
    <div className="space-y-6">
      <InlineEdit
        content={content}
        pageName="work"
        className="text-lg md:text-base leading-relaxed text-white/90 whitespace-pre-wrap"
      />
    </div>
  </PageLayout>
);

const Work = () => {
  useEffect(() => {
    document.title = "work | vlads.blog";
    return () => { document.title = "vlads.blog"; };
  }, []);

  const { data: pageContent, isLoading, error } = useQuery({
    queryKey: ['page-content', 'work'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_content')
        .select('content')
        .eq('page_name', 'work')
        .maybeSingle();

      if (error) throw error;

      return data?.content || "";
    },
    retry: 1,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
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

export default Work;
