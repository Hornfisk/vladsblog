
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-toast', '@radix-ui/react-tooltip'],
          'query-vendor': ['@tanstack/react-query'],
          'markdown-vendor': ['react-markdown', 'react-syntax-highlighter'],
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
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
