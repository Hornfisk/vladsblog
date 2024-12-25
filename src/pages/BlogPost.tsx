import { BlogHeader } from "@/components/BlogHeader";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BlogPost = () => {
  const { slug } = useParams();

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-4xl mx-auto px-4 py-12">
        {isLoading ? (
          <p className="text-gray-400">Loading post...</p>
        ) : !post ? (
          <p className="text-gray-400">Post not found.</p>
        ) : (
          <article className="prose prose-invert max-w-none">
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
              {post.title}
            </h1>
            <time className="text-sm text-gray-400 block mb-8">
              {new Date(post.created_at).toLocaleDateString()}
            </time>
            <div className="leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>
          </article>
        )}
      </main>
    </div>
  );
};

export default BlogPost;