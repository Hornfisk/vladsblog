import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { EditPostForm } from "./EditPostForm";
import { PostItem } from "./PostItem";
import { toast } from "sonner";

export const PostsList = () => {
  const [editingPost, setEditingPost] = useState<any>(null);
  const queryClient = useQueryClient();

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
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
      
      if (error) throw error;
      return postId;
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
        <PostItem
          key={post.id}
          post={post}
          onEdit={setEditingPost}
          onDelete={(postId) => deletePostMutation.mutate(postId)}
        />
      ))}
    </div>
  );
};