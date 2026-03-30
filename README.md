# vlads.blog

Personal blog and portfolio — covering cybersecurity, AI, and software.

**Live site:** [vlads.blog](https://vlads.blog)

## Stack

- **React 18** + **TypeScript** — frontend
- **Vite** — build tool with custom performance optimizations
- **Tailwind CSS** + **shadcn/ui** (Radix UI) — styling and components
- **TanStack Query** — server state and caching
- **React Router v6** — SPA routing with lazy-loaded routes
- **Supabase** — PostgreSQL database, auth, and edge functions
- **react-markdown** + **react-syntax-highlighter** — markdown rendering with syntax highlighting

## Features

- Blog with markdown posts, syntax highlighting, and publish/draft control
- Admin dashboard (auth-gated) for creating and editing posts
- Editable page content (homepage intro, about page) via admin
- Portfolio/work showcase section
- Contact form via Supabase Edge Function + Resend
- Post backup via Supabase Edge Function

## Running locally

**Prerequisites:** Node.js 18+, a Supabase project

```sh
git clone https://github.com/Hornfisk/vladsblog.git
cd vladsblog
npm install
```

Create a `.env` file at the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```sh
npm run dev
```

The app runs at `http://localhost:8080`.

## Build

```sh
npm run build      # production build
npm run preview    # preview the production build locally
```

## Deployment

Deployed as a static site (Netlify or similar). The `public/_headers` file sets long-lived cache headers for assets and security headers (`CSP`, `HSTS`, `X-Frame-Options`, etc.).

## Performance notes

The Vite config includes a custom `smartModulePreload` plugin that replaces Vite's default aggressive `__vite__preload()` injection. This prevents forcing a 263KB markdown vendor chunk download on every page load. Only critical chunks (react, query, UI) are preloaded; markdown rendering is deferred until a post page is actually visited.

`index.html` also starts Supabase REST fetches in `<head>` before React initializes, pre-seeding the React Query cache and cutting roughly 1–1.2s off LCP on slow connections.
