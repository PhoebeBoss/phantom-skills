import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

// GET /sitemap.xml — SEO sitemap
router.get("/sitemap.xml", async (_req, res) => {
  try {
    const base = process.env.APP_BASE_URL || "https://phantomcapital.live";
    const skills = await prisma.skill.findMany({ select: { slug: true, updatedAt: true } });

    const urls = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/canvas", priority: "0.9", changefreq: "hourly" },
      { loc: "/skills", priority: "0.8", changefreq: "daily" },
      { loc: "/skills/leaderboard", priority: "0.7", changefreq: "daily" },
      { loc: "/passport/integrate", priority: "0.8", changefreq: "weekly" },
      { loc: "/passport/tiers", priority: "0.7", changefreq: "weekly" },
      { loc: "/crypto/algorithms", priority: "0.7", changefreq: "weekly" },
      { loc: "/.well-known/agent.json", priority: "0.6", changefreq: "weekly" },
      ...skills.map((s) => ({
        loc: `/skills/${s.slug}`,
        priority: "0.6",
        changefreq: "weekly",
        lastmod: s.updatedAt?.toISOString()?.split("T")[0],
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${base}${u.loc}</loc>
    <priority>${u.priority}</priority>
    <changefreq>${u.changefreq}</changefreq>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
  </url>`
  )
  .join("\n")}
</urlset>`;

    res.type("application/xml").send(xml);
  } catch (err) {
    console.error("sitemap error:", err);
    res.status(500).send("Sitemap error");
  }
});

// GET /robots.txt — SEO robots
router.get("/robots.txt", (_req, res) => {
  const base = process.env.APP_BASE_URL || "https://phantomcapital.live";
  res.type("text/plain").send(`User-agent: *
Allow: /
Allow: /canvas
Allow: /skills
Allow: /passport/integrate
Allow: /passport/tiers
Allow: /crypto/algorithms
Disallow: /x402/
Disallow: /webhooks/
Disallow: /auth/
Disallow: /creator/

Sitemap: ${base}/sitemap.xml
`);
});

export default router;
