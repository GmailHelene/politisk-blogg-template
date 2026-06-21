#!/usr/bin/env node
/* Genererer sitemap.xml + rss.xml fra content/innhold.json + content/innlegg/index.json.
   Kjør fra repo-roten: node _tools/gen-feeds.js [baseUrl] */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const baseUrl = (process.argv[2] || "https://modumvil.no").replace(/\/$/, "");

const innhold = JSON.parse(fs.readFileSync(path.join(ROOT, "content/innhold.json"), "utf-8"));
const innleggIdxPath = path.join(ROOT, "content/innlegg/index.json");
const innleggArr = fs.existsSync(innleggIdxPath) ? JSON.parse(fs.readFileSync(innleggIdxPath, "utf-8")) : [];
const innlegg = Array.isArray(innleggArr) ? innleggArr : (innleggArr.innlegg || []);

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const isoDate = (d) => { try { return new Date(d).toISOString(); } catch { return new Date().toISOString(); } };

const today = new Date().toISOString().slice(0, 10);

// Sitemap
const staticUrls = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/om.html", changefreq: "monthly", priority: "0.6" },
  { loc: "/arkiv.html", changefreq: "weekly", priority: "0.8" },
  { loc: "/temaer.html", changefreq: "monthly", priority: "0.6" },
  { loc: "/serier.html", changefreq: "monthly", priority: "0.6" },
  { loc: "/skribenter.html", changefreq: "monthly", priority: "0.5" },
  { loc: "/fakta.html", changefreq: "monthly", priority: "0.7" },
  { loc: "/bidra.html", changefreq: "monthly", priority: "0.5" },
];
const serieUrls = (innhold.serier || []).filter((s) => s && s.tittel).map((s) => ({
  loc: "/serie.html?navn=" + encodeURIComponent(s.tittel), changefreq: "weekly", priority: "0.7",
}));
const temaUrls = (innhold.temaer || []).filter((t) => t && t.tittel).map((t) => ({
  loc: "/tema.html?navn=" + encodeURIComponent(t.tittel), changefreq: "monthly", priority: "0.5",
}));
const innleggUrls = innlegg.map((p) => ({
  loc: "/innlegg.html?slug=" + encodeURIComponent(p.slug),
  lastmod: p.dato || today,
  changefreq: "monthly",
  priority: "0.8",
}));

const urls = [...staticUrls, ...serieUrls, ...temaUrls, ...innleggUrls];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${baseUrl}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);

// RSS
const sitenavn = (innhold.info && innhold.info.navn) || "Politisk blogg";
const sitedesc = (innhold.info && (innhold.info.ingress || innhold.info.tittel)) || "Politisk blogg";
const items = innlegg.slice(0, 30).map((p) => {
  const url = baseUrl + "/innlegg.html?slug=" + encodeURIComponent(p.slug);
  return `    <item>
      <title>${esc(p.tittel)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.dato || today).toUTCString()}</pubDate>
      ${p.ingress ? `<description>${esc(p.ingress)}</description>` : ""}
    </item>`;
}).join("\n");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(sitenavn)}</title>
    <link>${baseUrl}/</link>
    <description>${esc(sitedesc)}</description>
    <language>nb-NO</language>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
fs.writeFileSync(path.join(ROOT, "rss.xml"), rss);

console.log("Skrev sitemap.xml (" + urls.length + " URL-er) og rss.xml (" + Math.min(innlegg.length, 30) + " innlegg). baseUrl=" + baseUrl);
