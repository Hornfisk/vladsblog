import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Wrap text into lines of at most maxChars characters
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3); // cap at 3 lines
}

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  const url = new URL(req.url);
  const rawTitle = url.searchParams.get("title") || "";
  const rawDesc = url.searchParams.get("description") || "";

  const isPost = rawTitle.length > 0;
  const titleLines = isPost ? wrapText(rawTitle, 30) : [];
  const desc = rawDesc ? rawDesc.slice(0, 90) : "cybersecurity & AI";

  // Layout constants
  const LEFT = 72;
  const titleFontSize = 62;
  const lineHeight = 78;
  const titleStartY = isPost ? 220 : 315;

  const titleSvg = titleLines
    .map(
      (line, i) =>
        `<text x="${LEFT}" y="${titleStartY + i * lineHeight}" font-family="monospace" font-size="${titleFontSize}" font-weight="700" fill="#9b87f5">${escapeXml(line)}</text>`
    )
    .join("\n  ");

  const descY = isPost ? titleStartY + titleLines.length * lineHeight + 52 : titleStartY + 72;

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="rgba(155,135,245,0.05)"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="#151821"/>
  <rect width="1200" height="630" fill="url(#dots)"/>

  <!-- Left accent bar -->
  <rect x="0" y="0" width="6" height="630" fill="#9b87f5"/>

  <!-- Watermark V -->
  <text x="980" y="580" font-family="monospace" font-size="560" font-weight="700"
        fill="#9b87f5" opacity="0.03" text-anchor="middle">V</text>

  <!-- Top label -->
  <text x="${LEFT}" y="80" font-family="monospace" font-size="26" fill="rgba(155,135,245,0.55)">~/vlads.blog</text>
  <line x1="${LEFT}" y1="100" x2="440" y2="100" stroke="rgba(155,135,245,0.15)" stroke-width="1"/>

  ${isPost ? `<!-- Post title -->
  ${titleSvg}
  <!-- Excerpt -->
  <text x="${LEFT}" y="${descY}" font-family="monospace" font-size="26" fill="rgba(255,255,255,0.38)">${escapeXml(desc)}</text>` : `<!-- Homepage brand -->
  <text x="${LEFT}" y="${titleStartY}" font-family="monospace" font-size="96" font-weight="700" fill="#9b87f5">vlads.blog</text>
  <text x="${LEFT}" y="${descY}" font-family="monospace" font-size="30" fill="rgba(255,255,255,0.38)">cybersecurity &amp; AI</text>`}

  <!-- Footer -->
  <line x1="${LEFT}" y1="560" x2="1128" y2="560" stroke="rgba(155,135,245,0.1)" stroke-width="1"/>
  <text x="${LEFT}" y="595" font-family="monospace" font-size="22" fill="rgba(155,135,245,0.35)">vlads.blog</text>
  <text x="1128" y="595" font-family="monospace" font-size="22" fill="rgba(155,135,245,0.2)" text-anchor="end">_</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
