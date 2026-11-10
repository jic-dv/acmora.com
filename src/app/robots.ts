import type { MetadataRoute } from "next";
import { env } from "@/shared/lib/env";
import { absoluteUrl } from "@/shared/lib/seo";

// Decision de negocio: se permite el acceso de buscadores y de crawlers de IA (GPTBot, OAI-SearchBot,
// PerplexityBot, ClaudeBot, Google-Extended) para ser citables. Para bloquear alguno, agregar una regla
// con su user agent y disallow "/". Revisar tambien el CDN/WAF: Cloudflare bloquea bots de IA por defecto.
export default function robots(): MetadataRoute.Robots {
  if (!env.indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
