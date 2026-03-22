import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";

const NotFound = () => {
  useEffect(() => {
    document.title = "404 — vlads.blog";
  }, []);

  return (
    <PageLayout>
      <section className="flex flex-col items-center text-center py-8">
        <img
          src="/404.png"
          alt="A confused pixel art cat staring at a cracked monitor displaying 404"
          className="w-64 md:w-80 mb-8 select-none"
          draggable={false}
        />

        <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
          {">"} page not found<span className="blink-cursor">_</span>
        </h1>

        <p className="text-gray-400 mb-1">
          this url doesn't exist.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          even the cat checked.
        </p>

        <Link
          to="/"
          className="text-accent1 hover:text-accent2 transition-colors underline underline-offset-4 text-sm"
        >
          ← back to posts
        </Link>
      </section>
    </PageLayout>
  );
};

export default NotFound;
