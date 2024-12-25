import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, LogOut, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export function BlogHeader() {
  const { session, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  return (
    <header className="w-full py-6 px-4 bg-gradient-to-r from-accent1/10 to-accent2/10 backdrop-blur-sm border-b border-accent1/10">
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
              bg-blogBg/95 md:bg-transparent
              backdrop-blur-sm md:backdrop-blur-none
              p-4 md:p-0
              border-b md:border-b-0 border-accent1/10
              space-y-4 md:space-y-0 md:space-x-6
              z-40
              items-start md:items-center
              font-mono
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
                    signOut();
                  }}
                  className="bg-accent1/10 hover:bg-accent1/20 border-accent1/50 w-full md:w-auto"
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
                  window.location.href = '/login';
                }}
                className="bg-accent1/10 hover:bg-accent1/20 border-accent1/50 w-full md:w-auto"
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