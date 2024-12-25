import { BlogHeader } from "@/components/BlogHeader";
import { BlogPost } from "@/components/BlogPost";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InlineEdit } from "@/components/admin/InlineEdit";

const Index = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['latest-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: pageContent } = useQuery({
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
  });

  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-6xl mx-auto px-4 py-12">
        <section className="mb-16">
          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
            {">"} Hello, cyber traveler_
          </h1>
          <InlineEdit
            content={pageContent || ""}
            pageName="home-intro"
            className="text-xl text-gray-300 max-w-2xl leading-relaxed"
          />
        </section>
        
        <section className="space-y-8">
          <h2 className="text-2xl font-bold mb-8">Latest Posts</h2>
          {isLoading ? (
            <p className="text-gray-400">Loading posts...</p>
          ) : !posts?.length ? (
            <p className="text-gray-400">No posts published yet.</p>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BlogPost
                  key={post.slug}
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