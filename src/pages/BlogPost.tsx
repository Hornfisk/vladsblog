
import { BlogHeader } from "@/components/BlogHeader";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Skeleton } from "@/components/ui/skeleton";

// Pre-fetch the SyntaxHighlighter styles
const preloadSyntaxStyles = () => {
  const style = nightOwl;
  return style;
};

// Memoize the markdown components configuration
const markdownComponents = {
  code: ({ node, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const code = String(children).replace(/\n$/, '');
    const isInline = !match && !code.includes('\n');

    if (!isInline) {
      return (
        <pre className="relative group mb-6 rounded-lg bg-[#332F63] p-6">
          <Button 
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-700/50"
            onClick={() => navigator.clipboard.writeText(code)}
          >
            <Copy className="h-4 w-4 text-gray-400 hover:text-accent1 transition-colors" />
          </Button>
          <SyntaxHighlighter
            language={match?.[1] || 'text'}
            style={nightOwl}
            customStyle={{
              background: 'transparent',
              padding: 0,
              margin: 0,
            }}
            PreTag="div"
          >
            {code}
          </SyntaxHighlighter>
        </pre>
      );
    }

    return (
      <code className="bg-[#151821] px-1.5 py-0.5 rounded text-sm text-accent1" {...props}>
        {children}
      </code>
    );
  },
};

const LoadingSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <Skeleton className="h-8 w-3/4 bg-gray-700/20" />
    <Skeleton className="h-4 w-1/4 bg-gray-700/20" />
    <div className="space-y-3">
      <Skeleton className="h-4 w-full bg-gray-700/20" />
      <Skeleton className="h-4 w-full bg-gray-700/20" />
      <Skeleton className="h-4 w-5/6 bg-gray-700/20" />
    </div>
  </div>
);

const BlogPost = () => {
  const { slug } = useParams();
  const { toast } = useToast();

  // Preload syntax highlighting styles
  preloadSyntaxStyles();

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      console.log('Attempting to fetch post with slug:', slug);
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) throw error;
      
      console.log('Successfully fetched post:', data);
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep unused data for 30 minutes
  });

  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
        {isLoading ? (
          <LoadingSkeleton />
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
              <ReactMarkdown components={markdownComponents}>
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
