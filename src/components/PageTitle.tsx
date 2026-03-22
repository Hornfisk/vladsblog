import { ReactNode } from "react";

interface PageTitleProps {
  children: ReactNode;
}

export function PageTitle({ children }: PageTitleProps) {
  return (
    <h1 className="text-4xl font-bold mb-4 md:mb-6 text-accent1">
      {"> "}{children}<span className="blink-cursor">_</span>
    </h1>
  );
}