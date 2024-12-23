import { BlogHeader } from "@/components/BlogHeader";
import { BlogPost } from "@/components/BlogPost";

const samplePost = {
  title: "Implementing Zero-Trust Security in Modern Applications",
  excerpt: "An in-depth exploration of zero-trust architecture principles and practical implementation strategies for modern cloud infrastructure. Learn about the key components, best practices, and common pitfalls to avoid.",
  date: "2024-02-20",
  slug: "zero-trust-security",
  tags: ["Zero Trust", "Cloud", "Architecture"],
  content: `
    Zero Trust security is revolutionizing how we approach network security in the cloud era. 
    Gone are the days of implicit trust within network perimeters...
  `,
};

const Blog = () => {
  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
      <BlogHeader />
      <main className="container max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-12 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
          {">"} Latest Posts_
        </h1>
        <div className="space-y-8">
          <BlogPost {...samplePost} />
        </div>
      </main>
    </div>
  );
};

export default Blog;