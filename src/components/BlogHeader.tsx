import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, LogOut } from "lucide-react";

export function BlogHeader() {
  const { session, signOut } = useAuth();

  return (
    <header className="w-full py-6 px-4 bg-gradient-to-r from-accent1/10 to-accent2/10 backdrop-blur-sm border-b border-accent1/10">
      <div className="container max-w-6xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text hover:opacity-80 transition-opacity font-mono">
          vlads.blog
        </Link>
        <nav className="flex items-center space-x-6 font-mono">
          <Link to="/" className="text-gray-300 hover:text-accent1 transition-colors">Home</Link>
          <Link to="/blog" className="text-gray-300 hover:text-accent1 transition-colors">Blog</Link>
          <Link to="/about" className="text-gray-300 hover:text-accent1 transition-colors">About</Link>
          {session ? (
            <>
              <Link to="/admin" className="text-gray-300 hover:text-accent1 transition-colors">Admin</Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                className="bg-accent1/10 hover:bg-accent1/20 border-accent1/50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/login'}
              className="bg-accent1/10 hover:bg-accent1/20 border-accent1/50"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}