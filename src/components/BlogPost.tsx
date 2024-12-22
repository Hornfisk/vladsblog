import { Link } from "react-router-dom";

interface BlogPostProps {
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  tags: string[];
}

export function BlogPost({ title, excerpt, date, slug, tags }: BlogPostProps) {
  return (
    <article className="p-6 rounded-lg bg-gradient-to-r from-accent1/5 to-accent2/5 border border-accent1/10 hover:border-accent1/30 transition-all">
      <Link to={`/blog/${slug}`}>
        <time className="text-sm text-gray-400">{date}</time>
        <h2 className="text-xl font-bold mt-2 mb-3 bg-gradient-to-r from-accent1 via-[#0EA5E9] to-accent2 text-transparent bg-clip-text">
          {title}
        </h2>
        <p className="text-gray-300 mb-4">{excerpt}</p>
        <div className="flex gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 text-sm rounded-full bg-accent1/10 text-accent1"
            >
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </article>
  );
}