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
        .maybeSingle();
      
      if (error) throw error;
      return data?.content || "A cybersecurity enthusiast and cloud infrastructure specialist with a passion for building secure, scalable systems. I specialize in penetration testing, cloud security architecture, and developing robust security solutions. When I'm not breaking (or fixing) things, I'm probably writing about it here or contributing to open-source security tools.";
    },
  });

  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
        <section className="mb-12 md:mb-16">
          <h1 className="text-5xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
            {"> "}About Me_
          </h1>
          <div className="space-y-6">
            <InlineEdit
              content={pageContent || ""}
              pageName="about"
              className="text-lg md:text-base text-gray-300 leading-relaxed"
            />
            <div className="flex gap-4">
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
        </section>
      </main>
    </div>
  );
};

export default About;