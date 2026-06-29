// Hidden easter-egg route — not linked anywhere in nav, kept out of the sitemap.
// 100% client-side: no backend, no network, nothing shared between visitors.
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { GameCanvas } from "@/components/arcade/GameCanvas";

const Arcade = () => {
  useEffect(() => {
    const prev = document.title;
    document.title = "clawd runner — vlads.blog";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="min-h-screen bg-blogBg text-gray-100 font-mono flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl">
        {/* terminal-style prompt header */}
        <p className="text-sm text-gray-400 mb-3">
          <span className="text-accent1">clawd@vlads</span>
          <span className="text-gray-500">:</span>
          <span className="text-accent2">~</span>
          <span className="text-gray-500">$</span> ./clawd_runner
          <span className="blink-cursor">_</span>
        </p>

        {/* game viewport */}
        <div className="relative w-full aspect-video rounded-md overflow-hidden border border-accent1/30 shadow-[0_0_40px_-12px_rgba(155,135,245,0.5)] bg-[#151821]">
          <GameCanvas />
        </div>

        {/* controls + back */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
          <p>
            <span className="text-gray-400">← →</span> move&nbsp;&nbsp;
            <span className="text-gray-400">space</span> jump&nbsp;&nbsp;
            <span className="text-gray-400">↓</span> duck&nbsp;&nbsp;
            <span className="text-gray-400">esc</span> menu&nbsp;&nbsp;
            <span className="text-gray-600">(mobile: tap to jump, hold lower-half to duck)</span>
          </p>
          <Link
            to="/"
            className="text-accent1 hover:text-accent2 transition-colors underline underline-offset-4 shrink-0"
          >
            ← back to posts
          </Link>
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-600">
          you found the secret. help clawd survive the codebase. 🦀
        </p>
      </div>
    </div>
  );
};

export default Arcade;
