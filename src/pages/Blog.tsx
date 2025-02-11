
import { BlogPost } from "@/components/BlogPost";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/PageTitle";
import { PageLayout } from "@/components/PageLayout";
import { Suspense } from "react";

const Blog = () => {
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['published-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });

  if (error) {
    console.error('Error loading posts:', error);
  }

  return (
    <PageLayout>
      <PageTitle>Latest Posts</PageTitle>
      <Suspense fallback={
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-700/20 rounded w-1/4 mb-2"></div>
              <div className="h-6 bg-gray-700/20 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-700/20 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      }>
        {isLoading ? null : !posts?.length ? (
          <p className="text-gray-400 text-base md:text-sm">No posts published yet.</p>
        ) : (
          <div className="grid gap-6 md:gap-8">
            {posts.map((post, index) => (
              <BlogPost
                key={post.id}
                title={post.title}
                excerpt={post.excerpt || ''}
                date={post.created_at}
                slug={post.slug}
                tags={[]}
                priority={index === 0} // Prioritize loading for the first post
              />
            ))}
          </div>
        )}
      </Suspense>
    </PageLayout>
  );
};

export default Blog;
