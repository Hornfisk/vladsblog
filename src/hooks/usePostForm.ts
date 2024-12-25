import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const usePostForm = (onPostCreated: () => void) => {
  const { user } = useAuth();
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

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!slug) {
      setSlug(generateSlug(newTitle));
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setExcerpt("");
    setSlug("");
    setIsPublished(false);
  };

  const checkSlugExists = async (slug: string) => {
    const { data } = await supabase
      .from("posts")
      .select("slug")
      .eq("slug", slug)
      .single();
    
    return !!data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to create posts");
      return;
    }

    if (!title || !content || !slug) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Check if slug already exists
      const slugExists = await checkSlugExists(slug);
      if (slugExists) {
        toast.error("A post with this URL already exists. Please choose a different one.");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("posts").insert({
        title,
        content,
        excerpt,
        slug,
        published: isPublished,
        author_id: user.id
      });

      if (error) throw error;

      toast.success("Post created successfully");
      resetForm();
      onPostCreated();
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
  };
};