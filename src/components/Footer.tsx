// src/components/Footer.tsx

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-gray-800/50">
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-2 text-xs text-gray-500 font-mono md:flex-row md:items-center md:justify-between">
        <div>© {year} vlad</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <a
            href="https://hyperfocusdsp.com"
            rel="noopener"
            target="_blank"
            className="hover:text-gray-300"
          >
            Hyperfocus DSP
          </a>
          <a
            href="https://ko-fi.com/hyperfocusdsp"
            rel="noopener"
            target="_blank"
            className="hover:text-gray-300"
          >
            Ko-fi
          </a>
        </div>
      </div>
    </footer>
  );
};
