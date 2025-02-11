
import { BlogHeader } from "@/components/BlogHeader";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BlogPost = () => {
  const { slug } = useParams();
  const { toast } = useToast();

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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast({
        title: "Copied!",
        description: "Code snippet copied to clipboard",
        duration: 2000,
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive",
      });
    });
  };

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
          <article className="prose prose-invert max-w-none [&_pre]:!p-0 [&_pre]:!m-0 [&_pre]:!bg-transparent">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
              {post.title}
            </h1>
            <time className="text-sm text-gray-400 block mb-8">
              {new Date(post.created_at).toLocaleDateString('en-GB')}
            </time>
            <div className="text-lg md:text-base text-gray-300 leading-relaxed">
              <ReactMarkdown components={{
                code: ({ node, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const code = String(children).replace(/\n$/, '');
                  const isInline = !match && !code.includes('\n');

                  if (!isInline) {
                    return (
                      <pre className="relative group mb-6 rounded-lg bg-[#151821] border border-gray-700/40 p-6">
                        <Button 
                          variant="ghost"
                          size="icon"
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-700/50"
                          onClick={() => handleCopyCode(code)}
                        >
                          <Copy className="h-4 w-4 text-gray-400 hover:text-accent1 transition-colors" />
                        </Button>
                        <code className="block overflow-x-auto text-sm text-gray-100">
                          {code}
                        </code>
                      </pre>
                    );
                  }

                  return (
                    <code className="bg-[#151821] px-1.5 py-0.5 rounded text-sm text-accent1" {...props}>
                      {children}
                    </code>
                  );
                },
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
