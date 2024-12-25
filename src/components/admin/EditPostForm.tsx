import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { FormField } from "./FormField";
import { PublishToggle } from "./PublishToggle";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditPostFormProps {
  post: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditPostForm = ({ post, onClose, onSuccess }: EditPostFormProps) => {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [excerpt, setExcerpt] = useState(post.excerpt || '');
  const [slug, setSlug] = useState(post.slug);
  const [isPublished, setIsPublished] = useState(post.published);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          title,
          content,
          excerpt,
          slug,
          published: isPublished,
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('Post updated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to update post: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-accent1/5 p-6 rounded-lg border border-accent1/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-200">Edit Post</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <FormField
          id="edit-title"
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Post title"
          required
        />

        <FormField
          id="edit-slug"
          label="Slug"
          value={slug}
          onChange={setSlug}
          placeholder="post-url-slug"
          required
        />

        <FormField
          id="edit-excerpt"
          label="Excerpt"
          value={excerpt}
          onChange={setExcerpt}
          placeholder="Brief description"
        />

        <FormField
          id="edit-content"
          label="Content"
          value={content}
          onChange={setContent}
          type="textarea"
          placeholder="Write your post content here..."
          required
        />

        <PublishToggle isPublished={isPublished} onChange={setIsPublished} />
      </div>

      <div className="flex justify-end">
        <Button 
          type="submit"
          className="bg-accent1/10 hover:bg-accent1/20 border border-accent1/50 text-accent1"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Update Post"}
        </Button>
      </div>
    </form>
  );
};