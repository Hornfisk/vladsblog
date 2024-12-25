import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { FormField } from "./FormField";
import { PublishToggle } from "./PublishToggle";
import { usePostForm } from "@/hooks/usePostForm";

export const BlogPostForm = ({ onPostCreated }: { onPostCreated: () => void }) => {
  const {
    title,
    content,
    excerpt,
    slug,
    isPublished,
    isSubmitting,
    handleTitleChange,
    setContent,
    setExcerpt,
    setSlug,
    setIsPublished,
    handleSubmit,
  } = usePostForm(onPostCreated);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-accent1/5 p-6 rounded-lg border border-accent1/10">
      <div className="space-y-4">
        <FormField
          id="title"
          label="Title"
          value={title}
          onChange={handleTitleChange}
          placeholder="Post title"
          required
        />

        <FormField
          id="slug"
          label="Slug"
          value={slug}
          onChange={setSlug}
          placeholder="post-url-slug"
          required
        />

        <FormField
          id="excerpt"
          label="Excerpt"
          value={excerpt}
          onChange={setExcerpt}
          placeholder="Brief description"
        />

        <FormField
          id="content"
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
          <Plus className="w-4 h-4 mr-2" />
          {isSubmitting ? "Saving..." : "Save Post"}
        </Button>
      </div>
    </form>
  );
};