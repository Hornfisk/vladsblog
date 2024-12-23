import { BlogHeader } from "@/components/BlogHeader";
import { Button } from "@/components/ui/button";
import { Linkedin } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";

const About = () => {
  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
          {">"} About Me_
        </h1>
        <div className="max-w-2xl mx-auto space-y-6">
          <p className="text-gray-300 leading-relaxed">
            [Placeholder] A cybersecurity enthusiast and cloud infrastructure specialist with a passion for building secure, scalable systems. More details coming soon...
          </p>
          <div className="pt-6 flex gap-4">
            <a 
              href="https://linkedin.com/in/your-profile" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button 
                className="bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white"
              >
                <Linkedin className="mr-2 h-5 w-5" />
                Connect on LinkedIn
              </Button>
            </a>
            <ContactForm />
          </div>
        </div>
      </main>
    </div>
  );
};

export default About;