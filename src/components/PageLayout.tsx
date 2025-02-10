// src/components/PageLayout.tsx
import { ReactNode } from 'react';
import { BlogHeader } from './BlogHeader';

interface PageLayoutProps {
  children: ReactNode;
}

export const PageLayout = ({ children }: PageLayoutProps) => (
  <div className="min-h-screen bg-blogBg text-gray-100 font-mono">
    <BlogHeader />
    <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {children}
    </main>
  </div>
);