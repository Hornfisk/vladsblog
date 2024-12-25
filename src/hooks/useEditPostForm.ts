import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface UseEditPostFormProps {
  post: any;
  onSuccess: () => void;
}

export const useEditPostForm = ({ post, onSuccess }: UseEditPostFormProps) => {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [excerpt, setExcerpt] = useState(post.excerpt || '');
  const [slug, setSlug] = useState(post.slug);
  const [isPublished, setIsPublished] = useState(post.published);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('Starting post update:', { id: post.id, title, content, excerpt, slug, isPublished });
      
      const { data: existingPost, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', post.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching existing post:', fetchError);
        throw new Error('Could not verify post access');
      }

      if (!existingPost) {
        throw new Error('Post not found');
      }

      const { data: updatedPost, error: updateError } = await supabase
        .from('posts')
        .update({
          title,
          content,
          excerpt,
          slug,
          published: isPublished,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error('Error updating post:', updateError);
        throw updateError;
      }

      if (!updatedPost) {
        throw new Error('Update succeeded but no data returned');
      }

      console.log('Post updated successfully:', updatedPost);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['post', post.slug] }),
        queryClient.invalidateQueries({ queryKey: ['post', slug] }),
        queryClient.invalidateQueries({ queryKey: ['posts'] }),
        queryClient.invalidateQueries({ queryKey: ['latest-posts'] }),
        queryClient.invalidateQueries({ queryKey: ['published-posts'] }),
      ]);

      await queryClient.refetchQueries({ 
        queryKey: ['post', slug],
        exact: true,
        type: 'active',
      });

      toast.success('Post updated successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to update post:', error);
      toast.error(`Failed to update post: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    title,
    setTitle,
    content,
    setContent,
    excerpt,
    setExcerpt,
    slug,
    setSlug,
    isPublished,
    setIsPublished,
    isSubmitting,
    handleSubmit,
  };
};