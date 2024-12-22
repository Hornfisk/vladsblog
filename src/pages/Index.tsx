import { BlogHeader } from "@/components/BlogHeader";
import { BlogPost } from "@/components/BlogPost";

const posts = [
  {
    title: "Implementing Zero-Trust Security in Modern Applications",
    excerpt: "An exploration of zero-trust architecture principles and practical implementation strategies for modern web applications.",
    date: "2024-02-20",
    slug: "zero-trust-security",
    tags: ["Security", "Architecture", "Best Practices"],
  },
  {
    title: "Advanced Penetration Testing Techniques",
    excerpt: "Deep dive into advanced penetration testing methodologies and tools used in cybersecurity assessments.",
    date: "2024-02-15",
    slug: "advanced-pentesting",
    tags: ["Security", "Pentesting", "Tools"],
  },
  {
    title: "Secure Code Review Best Practices",
    excerpt: "Essential guidelines and practices for conducting effective security-focused code reviews.",
    date: "2024-02-10",
    slug: "secure-code-review",
    tags: ["Security", "Code Quality", "Best Practices"],
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-6xl mx-auto px-4 py-12">
        <section className="mb-16">
          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
            > Hello, cyber traveler_
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl leading-relaxed">
            I'm Vlad, a cybersecurity nerd navigating the digital labyrinth. Here to share insights, break stuff (ethically), and maybe drop a few security breadcrumbs along the way. Grab a coffee, and let's explore the code less traveled.
          </p>
        </section>
        
        <section className="space-y-8">
          <h2 className="text-2xl font-bold mb-8">Latest Posts</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogPost key={post.slug} {...post} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;