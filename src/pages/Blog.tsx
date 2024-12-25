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
      <main className="container max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-12 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
          {">"} Latest Posts_
        </h1>
        {isLoading ? (
          <p className="text-gray-400">Loading posts...</p>
        ) : !posts?.length ? (
          <p className="text-gray-400">No posts published yet.</p>
        ) : (
          <div className="space-y-8">
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