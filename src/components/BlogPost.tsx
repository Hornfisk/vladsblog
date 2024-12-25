import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

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
  const formattedDate = format(new Date(date), 'dd/MM/yyyy');
  
  return (
    <article className="p-4 md:p-6 rounded-lg bg-gradient-to-r from-accent1/5 to-accent2/5 border border-accent1/10 hover:border-accent1/30 transition-all">
      <Link to={`/blog/${slug}`}>
        <time className="text-sm text-gray-400">{formattedDate}</time>
        <h2 className="text-lg md:text-xl font-bold mt-2 mb-2 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
          {title}
        </h2>
        <div className="prose prose-invert max-w-none text-base md:text-sm text-gray-300 mb-3">
          <ReactMarkdown components={{
            p: ({ children }) => <p className="text-gray-300">{children}</p>,
            a: ({ children, href }) => <a href={href} className="text-accent1 hover:text-accent2">{children}</a>,
            strong: ({ children }) => <strong className="text-gray-200">{children}</strong>,
            em: ({ children }) => <em className="text-gray-300">{children}</em>,
          }}>
            {truncateExcerpt(excerpt || '')}
          </ReactMarkdown>
        </div>
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