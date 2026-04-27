const SITE_ORIGIN = "https://vlads.blog";

const upsertLink = (rel: string, href: string) => {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const upsertMeta = (attr: "name" | "property", key: string, content: string) => {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

export const setCanonical = (path: string) => {
  const href = path.startsWith("http") ? path : `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
  upsertLink("canonical", href);
  upsertMeta("property", "og:url", href);
};

export const setPageMeta = (opts: { title: string; description?: string; path: string }) => {
  document.title = opts.title;
  setCanonical(opts.path);
  if (opts.description) {
    upsertMeta("name", "description", opts.description);
    upsertMeta("property", "og:description", opts.description);
    upsertMeta("name", "twitter:description", opts.description);
  }
  upsertMeta("property", "og:title", opts.title);
  upsertMeta("name", "twitter:title", opts.title);
};
