import { BlogHeader } from "@/components/BlogHeader";
import { BlogPost } from "@/components/BlogPost";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { PageTitle } from "@/components/PageTitle";

const Index = () => {
  const { data: posts, isLoading: postsLoading, error: postsError } = useQuery({
    queryKey: ['latest-posts'],
    queryFn: async () => {
      console.log('Fetching latest posts...');
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) {
          console.error('Error fetching posts:', error);
          throw error;
        }

        console.log('Posts fetched successfully:', data?.length || 0, 'posts');
        return data;
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        throw err;
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  const { data: pageContent, isLoading: contentLoading, error: contentError } = useQuery({
    queryKey: ['page-content', 'home-intro'],
    queryFn: async () => {
      console.log('Fetching page content...');
      try {
        const { data, error } = await supabase
          .from('page_content')
          .select('content')
          .eq('page_name', 'home-intro')
          .maybeSingle();

        if (error) {
          console.error('Error fetching page content:', error);
          throw error;
        }

        console.log('Page content fetched:', data?.content ? 'content present' : 'no content');
        return data?.content ?? "";
      } catch (err) {
        console.error('Failed to fetch page content:', err);
        throw err;
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  if (postsError) {
    console.error('Posts loading error:', postsError);
  }

  if (contentError) {
    console.error('Content loading error:', contentError);
  }

  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
        <section className="mb-12 md:mb-16">
          <PageTitle>Latest Posts</PageTitle>
          {contentLoading ? (
            <div className="animate-pulse bg-gray-700/20 h-24 rounded-md" />
          ) : contentError ? (
            <div className="text-red-400 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm">Unable to load content. Please try refreshing the page.</p>
            </div>
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
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-3">
                  <div className="h-6 bg-gray-700/20 rounded w-3/4" />
                  <div className="h-4 bg-gray-700/20 rounded w-1/4" />
                  <div className="h-20 bg-gray-700/20 rounded" />
                </div>
              ))}
            </div>
          ) : postsError ? (
            <div className="text-red-400 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm">Unable to load posts. Please try refreshing the page.</p>
            </div>
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