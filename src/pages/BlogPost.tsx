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
    retryDelay: 1000,
  });

  if (error) {
    console.error('Query error:', error);
  }

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
            <p className="text-sm">There was an error loading the post. Please try refreshing the page.</p>
            <p className="text-xs mt-2 text-red-300">Technical details: {error.message}</p>
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
              <ReactMarkdown components={{
                p: ({ children }) => <p className="text-gray-300 mb-4">{children}</p>,
                a: ({ children, href }) => <a href={href} className="text-accent1 hover:text-accent2 underline">{children}</a>,
                strong: ({ children }) => <strong className="text-gray-200 font-bold">{children}</strong>,
                em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
                h1: ({ children }) => <h1 className="text-3xl font-bold mt-10 mb-6 text-gray-100">{children}</h1>,
                h2: ({ children }) => <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-100">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xl font-bold mt-6 mb-3 text-gray-100">{children}</h3>,
                h4: ({ children }) => <h4 className="text-lg font-bold mt-4 mb-2 text-gray-100">{children}</h4>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>,
                li: ({ children }) => <li className="text-gray-300">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-accent1 pl-4 my-4 italic text-gray-400">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-800 px-1.5 py-0.5 rounded text-sm text-accent1">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4">
                    {children}
                  </pre>
                ),
              }}>
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