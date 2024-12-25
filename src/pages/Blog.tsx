import { BlogHeader } from "@/components/BlogHeader";
import { BlogPost } from "@/components/BlogPost";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Blog = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['published-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
        <h1 className="text-3xl md:text-2xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
          {"> "} Latest Posts_
        </h1>
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
                date={new Date(post.created_at).toLocaleDateString()}
                slug={post.slug}
                tags={[]} // We'll implement tags later
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Blog;