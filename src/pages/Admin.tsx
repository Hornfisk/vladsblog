import { BlogHeader } from "@/components/BlogHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Admin() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!session) {
      toast({
        title: "Access Denied",
        description: "Please log in to access the admin panel",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [session, navigate, toast]);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <BlogHeader />
      <main className="container max-w-6xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text font-mono">
            {">"} Dashboard_
          </h1>
          <Button
            onClick={() => navigate("/admin/new")}
            className="bg-accent1/10 hover:bg-accent1/20 border-accent1/50"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </div>
        <div className="grid gap-6">
          {/* Post list will be implemented in the next step */}
        </div>
      </main>
    </div>
  );
}