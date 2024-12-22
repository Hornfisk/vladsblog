import { Link } from "react-router-dom";

export function BlogHeader() {
  return (
    <header className="w-full py-6 px-4 bg-gradient-to-r from-accent1/10 to-accent2/10 backdrop-blur-sm border-b border-accent1/10">
      <div className="container max-w-6xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-accent1 via-[#0EA5E9] to-accent2 text-transparent bg-clip-text hover:opacity-80 transition-opacity font-mono">
          vlads.blog
        </Link>
        <nav className="space-x-6 font-mono">
          <Link to="/" className="text-gray-300 hover:text-accent1 transition-colors">Home</Link>
          <Link to="/blog" className="text-gray-300 hover:text-accent1 transition-colors">Blog</Link>
          <Link to="/about" className="text-gray-300 hover:text-accent1 transition-colors">About</Link>
        </nav>
      </div>
    </header>
  );
}