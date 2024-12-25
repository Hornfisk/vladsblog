import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const usePostForm = (onPostCreated: () => void) => {
  const { toast } = useToast();
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
      toast({
        title: "Error",
        description: "You must be logged in to create posts",
        variant: "destructive",
      });
      return;
    }

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
      // Check if slug already exists
      const slugExists = await checkSlugExists(slug);
      if (slugExists) {
        toast({
          title: "Error",
          description: "A post with this slug already exists. Please choose a different one.",
          variant: "destructive",
        });
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

      toast({
        title: "Success",
        description: "Post created successfully",
      });

      resetForm();
      onPostCreated();
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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