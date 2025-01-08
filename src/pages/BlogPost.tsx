import { BlogHeader } from "@/components/BlogHeader";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';

const BlogPost = () => {
  const { slug } = useParams();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      console.log('Attempting to fetch post with slug:', slug);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        
        if (error) {
          console.error('Supabase error fetching post:', error);
          throw error;
        }

        if (!data) {
          console.log('No post found with slug:', slug);
          return null;
        }

        console.log('Successfully fetched post:', data);
        return data;
      } catch (err) {
        console.error('Error in post fetch:', err);
        throw err;
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 10000),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700/20 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700/20 rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-700/20 rounded"></div>
              <div className="h-4 bg-gray-700/20 rounded"></div>
              <div className="h-4 bg-gray-700/20 rounded w-5/6"></div>
            </div>
          </div>
        ) : error ? (
          <div className="text-red-400 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <h2 className="text-lg font-semibold mb-2">Error Loading Post</h2>
            <p className="text-sm">Unable to load the post. Please try refreshing the page.</p>
          </div>
        ) : !post ? (
          <div className="text-gray-400 p-4 rounded-lg bg-gray-700/20 border border-gray-600/20">
            <h2 className="text-lg font-semibold mb-2">Post Not Found</h2>
            <p>The requested post could not be found.</p>
          </div>
        ) : (
          <article className="prose prose-invert max-w-none">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
              {post.title}
            </h1>
            <time className="text-sm text-gray-400 block mb-8">
              {new Date(post.created_at).toLocaleDateString('en-GB')}
            </time>
            <div className="text-lg md:text-base text-gray-300 leading-relaxed">
              <ReactMarkdown>
                {post.content}
              </ReactMarkdown>
            </div>
          </article>
        )}
      </main>
    </div>
  );
};

export default BlogPost;