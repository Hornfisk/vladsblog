import { BlogHeader } from "@/components/BlogHeader";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/ContactForm";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const About = () => {
  const { data: pageContent } = useQuery({
    queryKey: ['page-content', 'about'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_content')
        .select('content')
        .eq('page_name', 'about')
        .single();
      
      if (error && error.code !== 'PGSQL_NO_ROWS_RETURNED') throw error;
      return data?.content || "A cybersecurity enthusiast and cloud infrastructure specialist with a passion for building secure, scalable systems. I specialize in penetration testing, cloud security architecture, and developing robust security solutions. When I'm not breaking (or fixing) things, I'm probably writing about it here or contributing to open-source security tools.";
    },
  });

  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
          {">"} About Me_
        </h1>
        <div className="max-w-2xl mx-auto space-y-6">
          <InlineEdit
            content={pageContent || ""}
            pageName="about"
            className="text-gray-300 leading-relaxed"
          />
          <div className="pt-6 flex gap-4">
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