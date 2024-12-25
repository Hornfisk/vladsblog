import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      navigate("/admin");
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-blogBg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-background p-8 rounded-lg border border-accent1/10">
        <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text text-center">
          Welcome Back
        </h1>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#3b82f6',
                  brandAccent: '#2563eb',
                }
              }
            }
          }}
          providers={[]}
        />
      </div>
    </div>
  );
}