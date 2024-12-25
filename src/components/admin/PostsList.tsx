import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { EditPostForm } from "./EditPostForm";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const PostsList = () => {
  const [editingPost, setEditingPost] = useState<any>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: posts, isLoading, error: fetchError } = useQuery({
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

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
      
      if (deleteError) throw deleteError;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete post: ${error.message}`);
    },
  });

  if (isLoading) {
    return <div className="text-gray-400">Loading posts...</div>;
  }

  if (fetchError) {
    return <div className="text-red-400">Error loading posts: {fetchError.message}</div>;
  }

  if (!posts?.length) {
    return (
      <div className="bg-accent1/5 p-6 rounded-lg border border-accent1/10">
        <p className="text-gray-400">No posts yet. Create your first post!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {editingPost && (
        <EditPostForm
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSuccess={() => {
            setEditingPost(null);
            queryClient.invalidateQueries({ queryKey: ['posts'] });
          }}
        />
      )}
      
      {posts.map((post) => (
        <div 
          key={post.id} 
          className="p-4 border border-accent1/20 rounded-lg bg-blogBg/50 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">{post.title}</h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs ${
                post.published 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-yellow-500/20 text-yellow-400"
              }`}>
                {post.published ? "Published" : "Draft"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingPost(post)}
                className="h-8 w-8 text-accent1 hover:text-accent1/80 hover:bg-accent1/10"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this post?')) {
                    deletePostMutation.mutate(post.id);
                  }
                }}
                className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
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