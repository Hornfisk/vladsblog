
import { useEffect, useState } from "react";
import { BlogPost } from "@/components/BlogPost";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/PageTitle";
import { PageLayout } from "@/components/PageLayout";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 10;

const Blog = () => {
  const [page, setPage] = useState(0);
  const [allPosts, setAllPosts] = useState<any[]>([]);

  useEffect(() => {
    document.title = "vlads.blog";
  }, []);

  const { data: pageContent } = useQuery({
    queryKey: ["page-content", "home-intro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_content")
        .select("content")
        .eq("page_name", "home-intro")
        .maybeSingle();
      if (error) throw error;
      return data?.content ?? "";
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  const { data: pagePosts, isLoading, isFetching } = useQuery({
    queryKey: ["published-posts", page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    if (pagePosts && pagePosts.length > 0) {
      setAllPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newPosts = pagePosts.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newPosts];
      });
    }
  }, [pagePosts]);

  const hasMore = pagePosts?.length === PAGE_SIZE;

  return (
    <PageLayout>
      <section className="mb-10 md:mb-12">
        <PageTitle>posts</PageTitle>
        <div className="min-h-[1.75rem]">
          {pageContent !== undefined && (
            <InlineEdit
              content={pageContent}
              pageName="home-intro"
              className="text-lg md:text-base text-gray-400 max-w-2xl leading-relaxed"
            />
          )}
        </div>
      </section>

      <section>
        {isLoading && page === 0 ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse p-4 md:p-6 border border-gray-700/20 border-l-2">
                <div className="h-4 bg-gray-700/20 rounded w-1/4 mb-3" />
                <div className="h-6 bg-gray-700/20 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-700/20 rounded mb-2" />
                <div className="h-4 bg-gray-700/20 rounded mb-2" />
                <div className="h-4 bg-gray-700/20 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : allPosts.length === 0 ? (
          <p className="text-gray-400 text-sm">No posts published yet.</p>
        ) : (
          <>
            <div className="grid gap-6 md:gap-8">
              {allPosts.map((post, index) => (
                <BlogPost
                  key={post.id}
                  title={post.title}
                  excerpt={post.excerpt || ""}
                  date={post.created_at}
                  slug={post.slug}
                  tags={[]}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isFetching}
                  className="bg-accent1/5 hover:bg-accent1/10 border-accent1/20 text-gray-300 hover:text-accent1 transition-colors"
                >
                  {isFetching ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </PageLayout>
  );
};

export default Blog;
