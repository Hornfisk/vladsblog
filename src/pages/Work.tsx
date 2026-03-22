
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { PageTitle } from "@/components/PageTitle";

const Work = () => {
  useEffect(() => {
    document.title = "work | vlads.blog";
    return () => { document.title = "vlads.blog"; };
  }, []);

  return (
    <PageLayout>
      <PageTitle>work</PageTitle>

      <div className="space-y-6">
        {/* InsanaSonido */}
        <div className="bg-gradient-to-r from-accent1/5 to-accent2/5 border border-accent1/10 border-l-2 border-l-accent1/40 hover:border-accent1/30 hover:border-l-accent1 transition-all p-4 md:p-6 rounded-md">
          <div className="flex flex-wrap items-baseline gap-3 mb-2">
            <a
              href="https://insanasonido.es/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold text-accent1 hover:opacity-80 transition-opacity"
            >
              insanasonido.es
            </a>
            <span className="text-gray-400 text-sm">2026</span>
          </div>

          <p className="text-gray-300 mb-4">
            Bilingual event site for an underground electronic music promoter on Spain's South Coast.
          </p>

          <ul className="text-gray-300 text-sm space-y-1 mb-4 list-none">
            <li className="before:content-['→'] before:text-accent1/60 before:mr-2">Bilingual ES/EN with hreflang + geo-redirect edge function</li>
            <li className="before:content-['→'] before:text-accent1/60 before:mr-2">GDPR-compliant — Consent Mode v2, CSP hardening</li>
            <li className="before:content-['→'] before:text-accent1/60 before:mr-2">SEO-optimised — JSON-LD MusicEvent schema, sitemap, OG tags</li>
            <li className="before:content-['→'] before:text-accent1/60 before:mr-2">Zero infra cost — Netlify free tier, Cloudflare free tier</li>
          </ul>

          <div className="flex flex-wrap gap-2 mb-5">
            {["astro", "netlify", "cloudflare", "decap-cms", "ga4"].map((tag) => (
              <span key={tag} className="px-2 py-1 text-xs rounded-md bg-accent1/10 text-accent1">
                {tag}
              </span>
            ))}
          </div>

          <p className="text-gray-500 text-xs mb-4">~120h · est. value €5,000–7,000</p>

          <div className="flex flex-wrap gap-4 text-sm">
            <a
              href="https://insanasonido.es/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-accent1 transition-colors"
            >
              insanasonido.es ↗
            </a>
            <a
              href="https://github.com/Hornfisk/insanasonido"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-accent1 transition-colors"
            >
              github ↗
            </a>
            <Link
              to="/blog/insanasonido-case-study"
              className="text-accent1 hover:opacity-80 transition-opacity"
            >
              → read the case study
            </Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Work;
