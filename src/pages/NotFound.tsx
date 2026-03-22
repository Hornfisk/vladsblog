import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { PageTitle } from "@/components/PageTitle";

const NotFound = () => {
  useEffect(() => {
    document.title = "404 — vlads.blog";
  }, []);

  return (
    <PageLayout>
      <section className="mb-10">
        <PageTitle>404</PageTitle>
        <p className="text-gray-400 text-lg mb-6">
          page not found.
        </p>
        <Link
          to="/"
          className="text-accent1 hover:text-accent2 transition-colors underline underline-offset-4"
        >
          ← back to posts
        </Link>
      </section>
    </PageLayout>
  );
};

export default NotFound;
