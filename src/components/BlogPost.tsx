import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";

interface BlogPostProps {
  title: string;
  excerpt: string;
  date: string; // Ensure this is a string in ISO format (e.g., "2024-12-25")
  slug: string;
  tags: string[];
}

export function BlogPost({ title, excerpt, date, slug, tags }: BlogPostProps) {
  // Format the date, falling back to "Unknown Date" if parsing fails
  let formattedDate = "Unknown Date";
  try {
    formattedDate = format(parseISO(date), "MMMM dd, yyyy"); // e.g., "December 25, 2024"
  } catch (error) {
    console.error("Error parsing date:", error);
  }

  return (
    <article className="p-4 md:p-6 rounded-lg bg-gradient-to-r from-accent1/5 to-accent2/5 border border-accent1/10 hover:border-accent1/30 transition-all">
      <Link to={`/blog/${slug}`}>
        <time className="text-sm text-gray-400">{formattedDate}</time>
        <h2 className="text-lg md:text-xl font-bold mt-2 mb-2 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
          {title}
        </h2>
        <p className="text-base md:text-sm text-gray-300 mb-3">{excerpt}</p>
        <div className="flex gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs rounded-full bg-accent1/10 text-accent1"
            >
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </article>
  );
}

