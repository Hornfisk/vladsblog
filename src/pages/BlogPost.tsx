import { BlogHeader } from "@/components/BlogHeader";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BlogPost = () => {
  const { slug } = useParams();

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      console.log('Fetching post with slug:', slug);
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching post:', error);
        throw error;
      }

      if (!data) {
        console.log('No post found with slug:', slug);
        return null;
      }

      console.log('Successfully fetched post:', data);
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
        {isLoading ? (
          <p className="text-gray-400 text-base md:text-sm">Loading post...</p>
        ) : !post ? (
          <p className="text-gray-400 text-base md:text-sm">Post not found.</p>
        ) : (
          <article className="prose prose-invert max-w-none">
            <h1 className="text-3xl md:text-2xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
              {post.title}
            </h1>
            <time className="text-sm text-gray-400 block mb-8">
              {new Date(post.created_at).toLocaleDateString()}
            </time>
            <div className="text-lg md:text-base text-gray-300 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>
          </article>
        )}
      </main>
    </div>
  );
};

export default BlogPost;