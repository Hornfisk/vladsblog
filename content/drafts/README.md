# drafts

Content lives in Supabase (posts table + page_content table), not the
repo. This folder holds drafts in git so they're reviewable before they
go into the admin UI.

## Publishing flow

**Blog post** (`*.md`):
1. Copy the frontmatter values into the admin form fields at `/admin`
   (title, slug, excerpt, published).
2. Paste the body (everything after the frontmatter block) into the
   content field.
3. Upload any referenced images via the admin image upload; update the
   paths in the content if they differ from what's written here.
4. Save as draft, preview, publish.

**Work page section** (`work-*.txt`):
- The `/work` page is a single plain-text blob (no markdown). Paste the
  contents inline into the existing work copy via the admin editor,
  positioned wherever reads best.

## Images

Post images go under `public/posts/`. Referenced paths in draft
markdown assume that location. Convert to lossless WebP and strip
metadata before committing:

```sh
convert input.png -strip -define webp:lossless=true \
  -define webp:method=6 -define webp:exact=true \
  public/posts/slug.webp
```

