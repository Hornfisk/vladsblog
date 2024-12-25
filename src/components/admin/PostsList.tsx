import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PostsList = () => {
  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  if (!posts?.length) {
    return (
      <div className="bg-accent1/5 p-6 rounded-lg border border-accent1/10">
        <p className="text-gray-400">No posts yet. Create your first post!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div 
          key={post.id} 
          className="p-4 border border-accent1/20 rounded-lg bg-blogBg/50"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">{post.title}</h3>
            <span className={`px-2 py-1 rounded text-xs ${
              post.published 
                ? "bg-green-500/20 text-green-400" 
                : "bg-yellow-500/20 text-yellow-400"
            }`}>
              {post.published ? "Published" : "Draft"}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-2">{post.excerpt || "No excerpt"}</p>
          <div className="mt-2 text-xs text-gray-500">
            Created: {new Date(post.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
};