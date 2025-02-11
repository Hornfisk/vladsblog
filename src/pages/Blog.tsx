
import { BlogHeader } from "@/components/BlogHeader";
import { BlogPost } from "@/components/BlogPost";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/PageTitle";

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
  });

  if (error) {
    console.error('Error loading posts:', error);
  }

  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
        <PageTitle>Latest Posts</PageTitle>
        {isLoading ? (
          <p className="text-gray-400 text-base md:text-sm">Loading posts...</p>
        ) : !posts?.length ? (
          <p className="text-gray-400 text-base md:text-sm">No posts published yet.</p>
        ) : (
          <div className="grid gap-6 md:gap-8">
            {posts.map((post) => (
              <BlogPost
                key={post.id}
                title={post.title}
                excerpt={post.excerpt || ''}
                date={post.created_at}
                slug={post.slug}
                tags={[]}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Blog;
