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
    if (session && window.location.pathname.includes('/login')) {
      navigate("/admin");
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-blogBg">
      <BlogHeader />
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="w-full max-w-md mx-auto bg-accent1/5 p-8 rounded-lg border border-accent1/10">
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
                    brand: '#9b87f5',
                    brandAccent: '#D946EF',
                    brandButtonText: 'white',
                    defaultButtonBackground: '#1A1F2C',
                    defaultButtonBackgroundHover: '#272d3d',
                    inputBackground: '#1A1F2C',
                    inputBorder: '#9b87f580',
                    inputBorderHover: '#9b87f5',
                    inputBorderFocus: '#D946EF',
                    inputText: 'white',
                    inputPlaceholder: '#666',
                  },
                },
              },
              className: {
                container: 'text-gray-200',
                label: 'text-gray-200',
                button: 'bg-accent1/10 hover:bg-accent1/20 border border-accent1/50',
                input: 'bg-blogBg border-accent1/20 focus:border-accent1',
              },
            }}
            providers={[]}
            redirectTo={`${window.location.origin}/admin`}
          />
        </div>
      </div>
    </div>
  );
}