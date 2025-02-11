
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { memo } from "react";

interface BlogPostProps {
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  tags: string[];
  priority?: boolean;
}

const truncateExcerpt = (text: string, maxLength: number = 150) => {
  if (text.length <= maxLength) return text;
  const lastSpace = text.substring(0, maxLength).lastIndexOf(' ');
  return text.substring(0, lastSpace) + '...';
};

export const BlogPost = memo(({ title, excerpt, date, slug, tags, priority = false }: BlogPostProps) => {
  let formattedDate = "Unknown Date";
  try {
    formattedDate = format(parseISO(date), "MMMM dd, yyyy");
  } catch (error) {
    console.error("Error parsing date:", error);
  }

  return (
    <article 
      className={`p-4 md:p-6 rounded-md bg-gradient-to-r from-accent1/5 to-accent2/5 border border-accent1/10 hover:border-accent1/30 transition-all ${
        priority ? 'contents-visibility-visible' : 'contents-visibility-auto'
      }`}
    >
      <Link to={`/blog/${slug}`} className="block">
        <time className="text-sm text-gray-400">{formattedDate}</time>
        <h2 className="text-lg md:text-xl font-bold mt-2 mb-2 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
          {title}
        </h2>
        <p className="text-base md:text-sm text-gray-300 mb-3 leading-relaxed">
          {truncateExcerpt(excerpt)}
        </p>
        <div className="flex gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs rounded-md bg-accent1/10 text-accent1"
            >
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </article>
  );
});

BlogPost.displayName = 'BlogPost';
