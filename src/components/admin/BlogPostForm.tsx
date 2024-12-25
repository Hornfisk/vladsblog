import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const BlogPostForm = ({ onPostCreated }: { onPostCreated: () => void }) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [slug, setSlug] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!slug) {
      setSlug(generateSlug(newTitle));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !content || !slug) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("posts").insert([
        {
          title,
          content,
          excerpt,
          slug,
          published: isPublished,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post created successfully",
      });

      // Clear form
      setTitle("");
      setContent("");
      setExcerpt("");
      setSlug("");
      setIsPublished(false);
      
      // Notify parent component
      onPostCreated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-accent1/5 p-6 rounded-lg border border-accent1/10">
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-200 mb-1">
            Title
          </label>
          <Input
            id="title"
            value={title}
            onChange={handleTitleChange}
            className="bg-blogBg border-accent1/20 focus:border-accent1 text-gray-200"
            placeholder="Post title"
            required
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-200 mb-1">
            Slug
          </label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="bg-blogBg border-accent1/20 focus:border-accent1 text-gray-200"
            placeholder="post-url-slug"
            required
          />
        </div>

        <div>
          <label htmlFor="excerpt" className="block text-sm font-medium text-gray-200 mb-1">
            Excerpt
          </label>
          <Input
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="bg-blogBg border-accent1/20 focus:border-accent1 text-gray-200"
            placeholder="Brief description"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-200 mb-1">
            Content
          </label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[200px] bg-blogBg border-accent1/20 focus:border-accent1 text-gray-200"
            placeholder="Write your post content here..."
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="published"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="rounded border-accent1/20 bg-blogBg text-accent1"
          />
          <label htmlFor="published" className="text-sm font-medium text-gray-200">
            Publish immediately
          </label>
        </div>
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