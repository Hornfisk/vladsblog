import { BlogHeader } from "@/components/BlogHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlogPostForm } from "@/components/admin/BlogPostForm";
import { PostsList } from "@/components/admin/PostsList";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Admin = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) {
      navigate('/login');
    }
  }, [session, navigate]);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
        <h1 className="text-3xl md:text-2xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
          {"> "}Dashboard_
        </h1>
        <Card className="bg-accent1/5 border-accent1/10">
          <CardContent className="p-4">
            <Tabs defaultValue="new-post" className="w-full">
              <TabsList className="bg-accent1/10 border border-accent1/20">
                <TabsTrigger value="new-post" className="data-[state=active]:bg-accent1/20">
                  New Post
                </TabsTrigger>
                <TabsTrigger value="all-posts" className="data-[state=active]:bg-accent1/20">
                  All Posts
                </TabsTrigger>
              </TabsList>
              <TabsContent value="new-post" className="mt-4">
                <BlogPostForm />
              </TabsContent>
              <TabsContent value="all-posts" className="mt-4">
                <PostsList />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;