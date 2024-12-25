import { Button } from "@/components/ui/button";
import { FormField } from "./FormField";
import { PublishToggle } from "./PublishToggle";
import { useEditPostForm } from "@/hooks/useEditPostForm";
import { EditPostHeader } from "./EditPostHeader";

interface EditPostFormProps {
  post: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditPostForm = ({ post, onClose, onSuccess }: EditPostFormProps) => {
  const {
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
  } = useEditPostForm({ post, onSuccess });

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-accent1/5 p-6 rounded-lg border border-accent1/10">
      <EditPostHeader onClose={onClose} />

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