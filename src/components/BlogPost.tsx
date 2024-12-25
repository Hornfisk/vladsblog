import { Link } from "react-router-dom";

interface BlogPostProps {
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  tags: string[];
}

const truncateExcerpt = (text: string, maxLength: number = 150) => {
  if (text.length <= maxLength) return text;
  
  // Find the last space before maxLength to avoid cutting words in half
  const lastSpace = text.substring(0, maxLength).lastIndexOf(' ');
  return text.substring(0, lastSpace) + '...';
};

export function BlogPost({ title, excerpt, date, slug, tags }: BlogPostProps) {
  return (
    <article className="p-4 md:p-6 rounded-lg bg-gradient-to-r from-accent1/5 to-accent2/5 border border-accent1/10 hover:border-accent1/30 transition-all">
      <Link to={`/blog/${slug}`}>
        <time className="text-sm text-gray-400">{date}</time>
        <h2 className="text-lg md:text-xl font-bold mt-2 mb-2 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
          {title}
        </h2>
        <p className="text-base md:text-sm text-gray-300 mb-3">
          {truncateExcerpt(excerpt || '')}
        </p>
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