
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { writeFileSync } from "fs";
import { componentTagger } from "lovable-tagger";

// Build-time sitemap generation. Fetches published posts from Supabase using the
// public anon key (same one already exposed in index.html) and writes a full
// sitemap.xml with static routes + per-post URLs. Runs in `closeBundle` so it
// overwrites the static fallback that Vite copies from public/.
//
// Failure mode: log the error and write a minimal sitemap (homepage only) so a
// transient Supabase outage doesn't kill the deploy. Verify the dist output in CI
// if you want a hard gate.
function sitemapPlugin(): import("vite").Plugin {
  const SITE = "https://vlads.blog";
  const SB_URL = "https://owwhvpjerkjdbmfexfii.supabase.co";
  const SB_ANON =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93d2h2cGplcmtqZGJtZmV4ZmlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxMTg4MDksImV4cCI6MjA1MDY5NDgwOX0.o6RE9TajWTKPFrCxkK49f7d3l5XmsYAPjSh_Z1-ba74";

  const STATIC_ROUTES = [
    { loc: "/", priority: "1.0", changefreq: "weekly" },
    { loc: "/about", priority: "0.7", changefreq: "monthly" },
    { loc: "/work", priority: "0.7", changefreq: "monthly" },
  ];

  const buildXml = (urls: { loc: string; lastmod?: string; priority: string; changefreq: string }[]) => {
    const body = urls
      .map((u) => {
        const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : "";
        return `  <url>
    <loc>${SITE}${u.loc}</loc>${lastmod}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
      })
      .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  };

  return {
    name: "sitemap",
    apply: "build",
    async closeBundle() {
      const outPath = path.resolve(__dirname, "dist", "sitemap.xml");
      try {
        const r = await fetch(
          `${SB_URL}/rest/v1/posts?select=slug,created_at,updated_at&published=eq.true&order=created_at.desc`,
          { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` } }
        );
        if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
        const posts: { slug: string; created_at: string; updated_at: string | null }[] =
          await r.json();
        const postUrls = posts.map((p) => ({
          loc: `/blog/${p.slug}`,
          lastmod: (p.updated_at ?? p.created_at).slice(0, 10),
          priority: "0.8",
          changefreq: "monthly",
        }));
        const xml = buildXml([...STATIC_ROUTES, ...postUrls]);
        writeFileSync(outPath, xml);
        console.log(`[sitemap] wrote ${postUrls.length} post URL(s) + ${STATIC_ROUTES.length} static routes`);
      } catch (err) {
        const xml = buildXml(STATIC_ROUTES);
        writeFileSync(outPath, xml);
        console.warn(`[sitemap] fetch failed (${(err as Error).message}); wrote static-only fallback`);
      }
    },
  };
}

// Vite's default modulePreload aggressively preloads ALL lazy route dependencies
// at module execution time via injected __vite__preload() calls. This causes the
// 263KB gzip markdown-vendor to download on every homepage visit even though it's
// only needed on blog post pages (~1.3s wasted on Slow 4G).
//
// Fix: disable Vite's modulePreload entirely (stops JS-level __vite__preload calls),
// then manually add back <link rel="modulepreload"> only for chunks that are
// statically imported on every page (react, query, ui vendors).
function smartModulePreload(): import("vite").Plugin {
  const criticalPrefixes = ["react-vendor", "query-vendor", "ui-vendor"];
  const criticalChunks: string[] = [];

  return {
    name: "smart-module-preload",
    generateBundle(_opts, bundle) {
      for (const filename of Object.keys(bundle)) {
        if (
          criticalPrefixes.some((p) => filename.includes(p)) &&
          filename.endsWith(".js")
        ) {
          criticalChunks.push(`/${filename}`);
        }
      }
    },
    transformIndexHtml: {
      order: "post",
      handler(html: string) {
        const tags = criticalChunks
          .map((f) => `<link rel="modulepreload" crossorigin href="${f}">`)
          .join("\n    ");
        return html.replace("</head>", `    ${tags}\n  </head>`);
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        // Function form required so we can pin Vite's __vite__preload helper into
        // react-vendor. With the object form, Rollup placed the helper inside
        // markdown-vendor, which forced a static import from index.js →
        // markdown-vendor (263 KB) on every page load — even on the homepage.
        manualChunks(id) {
          // Pin Vite's preload helper to react-vendor (already a critical chunk).
          // This breaks the index.js → markdown-vendor static import.
          if (id === '\0vite/preload-helper.js') return 'react-vendor';

          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/')
          ) return 'react-vendor';

          if (
            id.includes('node_modules/@radix-ui/react-toast') ||
            id.includes('node_modules/@radix-ui/react-tooltip')
          ) return 'ui-vendor';

          if (id.includes('node_modules/@tanstack/react-query')) return 'query-vendor';

          if (
            id.includes('node_modules/react-markdown') ||
            id.includes('node_modules/react-syntax-highlighter')
          ) return 'markdown-vendor';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: true,
    sourcemap: false,
    // Disable JS-level modulepreload injection (__vite__preload calls).
    // Without this, Vite eagerly fetches ALL lazy route dependencies (including
    // the 263KB gzip markdown-vendor) at homepage load time, killing mobile perf.
    // Static imports still download in parallel via normal ES module resolution.
    modulePreload: false,
  },
  plugins: [
    react(),
    smartModulePreload(),
    sitemapPlugin(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
