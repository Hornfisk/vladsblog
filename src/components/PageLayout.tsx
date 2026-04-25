
// src/components/PageLayout.tsx
import { ReactNode } from 'react';
import { BlogHeader } from './BlogHeader';
import { Footer } from './Footer';

interface PageLayoutProps {
  children: ReactNode;
}

export const PageLayout = ({ children }: PageLayoutProps) => (
  <div className="min-h-screen flex flex-col bg-blogBg text-gray-100 font-mono">
    <BlogHeader />
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-12">
      {children}
    </main>
    <Footer />
  </div>
);
