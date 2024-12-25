import { BlogHeader } from "@/components/BlogHeader";
import { BlogPost } from "@/components/BlogPost";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { PageTitle } from "@/components/PageTitle";

const Index = () => {
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['latest-posts'],
    queryFn: async () => {
      console.log('Fetching latest posts...');
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, excerpt, created_at, slug')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }
      console.log('Fetched posts:', data);
      return data;
    },
  });

  const { data: pageContent, isLoading: contentLoading } = useQuery({
    queryKey: ['page-content', 'home-intro'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_content')
        .select('content')
        .eq('page_name', 'home-intro')
        .maybeSingle();
      
      if (error) throw error;
      return data?.content || "I'm Vlad, a cybersecurity nerd navigating the digital labyrinth. Here to share insights, break stuff (ethically), and maybe drop a few security breadcrumbs along the way. Grab a coffee, and let's explore the code less traveled.";
    },
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
  });

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
                  date={new Date(post.created_at).toLocaleDateString()}
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