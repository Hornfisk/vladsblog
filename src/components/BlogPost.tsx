import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

interface BlogPostProps {
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  tags: string[];
}

const truncateExcerpt = (text: string, maxLength: number = 150) => {
  if (text.length <= maxLength) return text;
  const lastSpace = text.substring(0, maxLength).lastIndexOf(' ');
  return text.substring(0, lastSpace) + '...';
};

export function BlogPost({ title, excerpt, date, slug, tags }: BlogPostProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  return (
    <article className="p-4 md:p-6 rounded-lg bg-gradient-to-r from-accent1/5 to-accent2/5 border border-accent1/10 hover:border-accent1/30 transition-all">
      <Link to={`/blog/${slug}`} className="block">
        <time className="text-sm text-gray-400 font-mono">{formattedDate}</time>
        <h2 className="text-2xl md:text-3xl font-bold mt-3 mb-4 bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text leading-tight">
          {title}
        </h2>
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown components={{
            p: ({ children }) => <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>,
            a: ({ children, href }) => (
              <a href={href} className="text-accent1 hover:text-accent2 underline transition-colors">
                {children}
              </a>
            ),
            strong: ({ children }) => <strong className="text-gray-200 font-semibold">{children}</strong>,
            em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-100 leading-tight">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-bold mt-6 mb-3 text-gray-100 leading-tight">
                {children}
              </h3>
            ),
            ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>,
            li: ({ children }) => <li className="text-gray-300 leading-relaxed">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-accent1 pl-4 my-6 italic text-gray-400">
                {children}
              </blockquote>
            ),
            code: ({ children }) => (
              <code className="font-mono bg-gray-800 px-1.5 py-0.5 rounded text-sm text-accent1">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="font-mono bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4">
                {children}
              </pre>
            ),
          }}>
            {truncateExcerpt(excerpt || '')}
          </ReactMarkdown>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs rounded-full bg-accent1/10 text-accent1 font-mono"
            >
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </article>
  );
}