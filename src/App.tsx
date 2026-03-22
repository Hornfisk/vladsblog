
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Component, Suspense, lazy } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { PageTitle } from "@/components/PageTitle";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-blogBg text-gray-100 font-mono flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-accent1 text-lg">something went wrong</p>
            <button
              className="text-sm text-gray-400 underline hover:text-gray-200"
              onClick={() => this.setState({ hasError: false })}
            >
              try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Blog (homepage) is eagerly loaded to avoid Suspense cascade on first paint
import Blog from "./pages/Blog";

// Lazy load less-frequent route components
const BlogPost = lazy(() => import("./pages/BlogPost"));
const About = lazy(() => import("./pages/About"));
const Login = lazy(() => import("./pages/Login"));
const Work = lazy(() => import("./pages/Work"));
const Admin = lazy(() => import("./pages/Admin"));
import NotFound from "./pages/NotFound";

const LoadingFallback = () => (
  <div className="min-h-screen bg-blogBg text-gray-100 font-mono flex items-center justify-center">
    <PageTitle>Loading...</PageTitle>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <div className="min-h-screen bg-blogBg">
          <Toaster />
          <Sonner />
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Blog />} />
                <Route path="/blog" element={<Navigate to="/" replace />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/about" element={<About />} />
                <Route path="/work" element={<Work />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
