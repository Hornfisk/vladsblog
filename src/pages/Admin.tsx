import { BlogHeader } from "@/components/BlogHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";

export default function Admin() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [slug, setSlug] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing posts for the current user
  const { data: posts, refetch: refetchPosts } = useQuery({
    queryKey: ['posts', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', session?.user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  useEffect(() => {
    if (!session) {
      console.log("No session found, redirecting to login");
      navigate("/login");
      return;
    }
  }, [session, navigate]);

  if (!session) return null;

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
          author_id: session.user.id,
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
      
      // Refresh posts list
      refetchPosts();
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
    <div className="min-h-screen bg-blogBg">
      <BlogHeader />
      <main className="container max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text font-mono">
            {">"} Dashboard_
          </h1>

          <Tabs defaultValue="new-post" className="w-full">
            <TabsList className="bg-accent1/10 border border-accent1/20">
              <TabsTrigger value="new-post" className="data-[state=active]:bg-accent1/20">
                New Post
              </TabsTrigger>
              <TabsTrigger value="posts" className="data-[state=active]:bg-accent1/20">
                All Posts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new-post">
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
                      className="bg-blogBg border-accent1/20 focus:border-accent1"
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
                      className="bg-blogBg border-accent1/20 focus:border-accent1"
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
                      className="bg-blogBg border-accent1/20 focus:border-accent1"
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
                      className="min-h-[200px] bg-blogBg border-accent1/20 focus:border-accent1"
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
                    <Save className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Saving..." : "Save Post"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="posts">
              <div className="bg-accent1/5 p-6 rounded-lg border border-accent1/10">
                {posts?.length === 0 ? (
                  <p className="text-gray-400">No posts yet. Create your first post!</p>
                ) : (
                  <div className="space-y-4">
                    {posts?.map((post) => (
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
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}