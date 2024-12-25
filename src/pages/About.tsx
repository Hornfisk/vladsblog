import { BlogHeader } from "@/components/BlogHeader";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/ContactForm";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/PageTitle";
import { useEffect } from "react";

const About = () => {
  // Add debugging logs
  useEffect(() => {
    console.log("About component mounted");
    return () => console.log("About component unmounted");
  }, []);

  const { data: pageContent, isLoading, error } = useQuery({
    queryKey: ['page-content', 'about'],
    queryFn: async () => {
      console.log("Fetching about page content");
      try {
        const { data, error } = await supabase
          .from('page_content')
          .select('content')
          .eq('page_name', 'about')
          .maybeSingle();
        
        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }

        console.log("Received data:", data);
        return data?.content || "A cybersecurity enthusiast and cloud infrastructure specialist with a passion for building secure, scalable systems. I specialize in penetration testing, cloud security architecture, and developing robust security solutions. When I'm not breaking (or fixing) things, I'm probably writing about it here or contributing to open-source security tools.";
      } catch (err) {
        console.error("Query error:", err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
  });

  // Add more debugging logs
  useEffect(() => {
    console.log("Current state:", { isLoading, error, hasContent: !!pageContent });
  }, [isLoading, error, pageContent]);

  // Render a basic structure while loading
  if (isLoading) {
    console.log("Rendering loading state");
    return (
      <div className="min-h-screen bg-blogBg">
        <BlogHeader />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <PageTitle>About Me</PageTitle>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-accent1/10 rounded w-3/4"></div>
            <div className="h-4 bg-accent1/10 rounded w-1/2"></div>
            <div className="h-4 bg-accent1/10 rounded w-2/3"></div>
          </div>
        </main>
      </div>
    );
  }

  // Show error state
  if (error) {
    console.error("Rendering error state:", error);
    return (
      <div className="min-h-screen bg-blogBg">
        <BlogHeader />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <PageTitle>About Me</PageTitle>
          <div className="p-4 rounded bg-red-500/10 text-red-500 border border-red-500/20">
            Error loading content. Please try refreshing the page.
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-2 text-sm">
                {error.message}
              </pre>
            )}
          </div>
        </main>
      </div>
    );
  }

  console.log("Rendering main content");
  // Main content render
  return (
    <div className="min-h-screen bg-blogBg">
      <BlogHeader />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <PageTitle>About Me</PageTitle>
        <div className="space-y-6">
          <InlineEdit
            content={pageContent || ""}
            pageName="about"
            className="text-lg md:text-base leading-relaxed text-white/90"
          />
          <div className="flex flex-wrap gap-4">
            <Button 
              variant="outline"
              className="bg-accent1/10 hover:bg-accent1/20 border-accent1/50"
              asChild
            >
              <a 
                href="https://www.linkedin.com/in/vladsec" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
            </Button>
            <ContactForm />
          </div>
        </div>
      </main>
    </div>
  );
};

export default About;