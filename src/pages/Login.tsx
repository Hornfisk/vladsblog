import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BlogHeader } from "@/components/BlogHeader";

export default function Login() {
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      navigate("/admin");
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <BlogHeader />
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="w-full max-w-md mx-auto bg-card p-8 rounded-lg border">
          <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text text-center font-mono">
            Welcome Back
          </h1>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'rgb(var(--accent1))',
                    brandAccent: 'rgb(var(--accent2))',
                  }
                }
              }
            }}
            providers={[]}
          />
        </div>
      </div>
    </div>
  );
}