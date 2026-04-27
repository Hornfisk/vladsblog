import { useEffect } from "react";
import { BlogHeader } from "@/components/BlogHeader";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from "@/components/CodeBlock";
import { Skeleton } from "@/components/ui/skeleton";

const markdownComponents = {
  img: ({ src, alt }: any) => (
    <img
      src={src}
      alt={alt}
      className="rounded-lg max-w-full h-auto my-6 border border-white/10"
      loading="lazy"
    />
  ),
  code: ({ className, children }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const code = String(children).replace(/\n$/, "");
    const isInline = !match && !code.includes("\n");

    if (!isInline) {
      return <CodeBlock language={match?.[1] || "text"} code={code} />;
    }

    // Inline code — intentionally omits ...props spread (no AST attributes needed here)
    return (
      <code className="bg-[#151821] px-1.5 py-0.5 rounded text-sm text-accent1">
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

  const setMeta = (attr: "name" | "property", key: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  const setCanonical = (href: string) => {
    let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      document.head.appendChild(el);
    }
    el.setAttribute("href", href);
  };

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    if (!post) return;

    const postUrl = `https://vlads.blog/blog/${post.slug}`;
    document.title = `${post.title} | vlads.blog`;
    setMeta("name", "description", post.excerpt || post.title);
    setCanonical(postUrl);
    setMeta("property", "og:title", `${post.title} | vlads.blog`);
    setMeta("property", "og:description", post.excerpt || post.title);
    setMeta("property", "og:url", postUrl);
    setMeta("property", "og:type", "article");
    const ogImageUrl = new URL("https://owwhvpjerkjdbmfexfii.supabase.co/functions/v1/og-image");
    ogImageUrl.searchParams.set("title", post.title);
    if (post.excerpt) ogImageUrl.searchParams.set("description", post.excerpt);
    setMeta("property", "og:image", ogImageUrl.toString());
    setMeta("property", "og:image:type", "image/svg+xml");
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("name", "twitter:title", `${post.title} | vlads.blog`);
    setMeta("name", "twitter:description", post.excerpt || post.title);
    setMeta("name", "twitter:image", ogImageUrl.toString());

    const scriptId = "json-ld-blogpost";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
      headline: post.title,
      description: post.excerpt || "",
      datePublished: post.created_at,
      dateModified: post.updated_at || post.created_at,
      author: { "@id": "https://vlads.blog/#person" },
      publisher: { "@id": "https://vlads.blog/#person" },
      image: ogImageUrl.toString(),
      url: postUrl,
      isPartOf: { "@id": "https://vlads.blog/#website" },
    });

    return () => {
      document.title = "vlads.blog";
      document.getElementById(scriptId)?.remove();
      setCanonical("https://vlads.blog/");
      setMeta("property", "og:type", "website");
    };
  }, [post]);

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
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
