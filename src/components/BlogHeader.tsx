
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, LogOut, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function BlogHeader() {
  const { session, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Close menu when route changes
  useEffect(() => {
    return () => setIsMenuOpen(false);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const nav = document.getElementById('mobile-nav');
      const button = document.getElementById('menu-button');
      if (isMenuOpen && nav && !nav.contains(event.target as Node) && !button?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success("Logged out successfully");
      navigate('/');
      // Force reload to clear any cached state
      window.location.reload();
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error("Failed to log out");
    }
  };

  return (
    <header className="sticky top-0 w-full py-6 px-4 bg-[#1E1E3F]/80 backdrop-blur-sm z-50">
      <div className="container max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <Link
            to="/"
            className="text-2xl font-bold bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text hover:opacity-80 transition-opacity font-mono"
          >
            vlads.blog
          </Link>

          <button
            id="menu-button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="md:hidden text-gray-300 hover:text-accent1 transition-colors z-50"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <nav
            id="mobile-nav"
            className={`
              ${isMenuOpen ? 'flex' : 'hidden'} 
              md:flex
              flex-col md:flex-row
              fixed md:relative
              top-[5rem] md:top-0
              left-0 md:left-auto
              right-0 md:right-auto
              bg-[#1E1E3F]/95 backdrop-blur-sm md:bg-transparent
              p-4 md:p-0
              space-y-4 md:space-y-0 md:space-x-6
              z-40
              items-start md:items-center
              font-mono
              ${isMenuOpen ? 'min-h-[calc(100vh-5rem)]' : ''}
            `}
          >
            <Link
              to="/"
              className="text-gray-300 hover:text-accent1 transition-colors w-full md:w-auto"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/blog"
              className="text-gray-300 hover:text-accent1 transition-colors w-full md:w-auto"
              onClick={() => setIsMenuOpen(false)}
            >
              Blog
            </Link>
            <Link
              to="/about"
              className="text-gray-300 hover:text-accent1 transition-colors w-full md:w-auto"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            {session ? (
              <>
                <Link
                  to="/admin"
                  className="text-gray-300 hover:text-accent1 transition-colors w-full md:w-auto"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLogout();
                  }}
                  className="bg-accent1/10 hover:bg-accent1/20 border-accent1/50 text-white w-full md:w-auto"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/login');
                }}
                className="bg-accent1/10 hover:bg-accent1/20 border-accent1/50 text-white w-full md:w-auto"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
