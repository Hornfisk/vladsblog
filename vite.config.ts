
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Remove modulepreload for large chunks that are only needed on sub-pages.
// Vite adds modulepreload for all manualChunks, but markdown-vendor (748KB) is
// only used on blog post pages — preloading it on the homepage wastes ~1.3s of
// Slow 4G bandwidth.
function filterModulePreload(): import("vite").Plugin {
  return {
    name: "filter-module-preload",
    transformIndexHtml: {
      order: "post",
      handler(html: string) {
        return html.replace(
          /<link rel="modulepreload" crossorigin href="\/assets\/markdown-[^"]+\.js">\n?/g,
          ""
        );
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
  },
  plugins: [
    react(),
    filterModulePreload(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
