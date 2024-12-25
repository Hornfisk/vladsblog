import { BlogHeader } from "@/components/BlogHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { PostsList } from "@/components/admin/PostsList";
import { useQueryClient } from "@tanstack/react-query";

export default function Admin() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session) {
      console.log("No session found, redirecting to login");
      navigate("/login");
      return;
    }
  }, [session, navigate]);

  if (!session) return null;

  const handlePostCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
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
              <BlogPostForm onPostCreated={handlePostCreated} />
            </TabsContent>

            <TabsContent value="posts">
              <PostsList />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}