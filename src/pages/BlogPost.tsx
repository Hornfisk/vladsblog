import { BlogHeader } from "@/components/BlogHeader";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';

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
            <h1 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
              {post.title}
            </h1>
            <time className="text-sm text-gray-400 block mb-8">
              {new Date(post.created_at).toLocaleDateString()}
            </time>
            <div className="text-lg md:text-base text-gray-300 leading-relaxed">
              <ReactMarkdown components={{
                p: ({ children }) => <p className="text-gray-300 mb-4">{children}</p>,
                a: ({ children, href }) => <a href={href} className="text-accent1 hover:text-accent2 underline">{children}</a>,
                strong: ({ children }) => <strong className="text-gray-200 font-bold">{children}</strong>,
                em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
                h2: ({ children }) => <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-100">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xl font-bold mt-6 mb-3 text-gray-100">{children}</h3>,
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