import { BlogHeader } from "@/components/BlogHeader";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/ContactForm";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle } from "@/components/PageTitle";

const About = () => {
  const { data: pageContent, isLoading, error } = useQuery({
    queryKey: ['page-content', 'about'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_content')
        .select('content')
        .eq('page_name', 'about')
        .maybeSingle();
      
      if (error) {
        throw error;
      }

      return data?.content || "A cybersecurity enthusiast and cloud infrastructure specialist with a passion for building secure, scalable systems. I specialize in penetration testing, cloud security architecture, and developing robust security solutions. When I'm not breaking (or fixing) things, I'm probably writing about it here or contributing to open-source security tools.";
    },
  });

  return (
    <div className="min-h-screen bg-blogBg">
      <BlogHeader />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <PageTitle>About Me</PageTitle>
        
        {isLoading && (
          <div className="p-4 rounded bg-accent1/10 text-white">
            Loading content...
          </div>
        )}

        {error && (
          <div className="p-4 rounded bg-red-500/10 text-red-500 border border-red-500/20">
            Error loading content. Please try refreshing the page.
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-6">
            <InlineEdit
              content={pageContent || ""}
              pageName="about"
              className="text-lg md:text-base leading-relaxed text-white"
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
        )}
      </main>
    </div>
  );
};

export default About;