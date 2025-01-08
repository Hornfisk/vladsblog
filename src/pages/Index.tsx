import { BlogHeader } from "@/components/BlogHeader";
import { BlogPost } from "@/components/BlogPost";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { PageTitle } from "@/components/PageTitle";
import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    console.log('Index component mounted');
    return () => {
      console.log('Index component unmounted');
    };
  }, []);

  const { data: posts, isLoading: postsLoading, error } = useQuery({
    queryKey: ['latest-posts'],
    queryFn: async () => {
      console.log('Fetching latest posts...');
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(3)
        .throwOnError();

      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }

      console.log('Posts fetched successfully:', data?.length || 0, 'posts');
      return data;
    },
  });

  const { data: pageContent, isLoading: contentLoading } = useQuery({
    queryKey: ['page-content', 'home-intro'],
    queryFn: async () => {
      console.log('Fetching page content...');
      const { data, error } = await supabase
        .from('page_content')
        .select('content')
        .eq('page_name', 'home-intro')
        .maybeSingle()
        .throwOnError();

      if (error) throw error;
      console.log('Page content fetched:', data?.content ? 'content present' : 'no content');
      return data?.content ?? "";
    },
  });

  if (error) {
    console.error('Error loading posts:', error);
  }

  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
        <section className="mb-12 md:mb-16">
          <PageTitle>Latest Posts</PageTitle>
          {contentLoading ? (
            <div className="animate-pulse bg-gray-700/20 h-24 rounded-md" />
          ) : (
            <InlineEdit
              content={pageContent || ""}
              pageName="home-intro"
              className="text-lg md:text-base text-gray-300 max-w-2xl leading-relaxed"
            />
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6 md:mb-8">Recent Updates</h2>
          {postsLoading ? (
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
                  date={post.created_at}
                  slug={post.slug}
                  tags={[]}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;