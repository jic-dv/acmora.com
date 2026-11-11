import type { MetadataRoute } from "next";
import { env } from "@/shared/lib/env";
import { absoluteUrl } from "@/shared/lib/seo";

/**
 * Buscadores y asistentes con IA que se permiten de forma explicita (ademas de la regla general): asi el sitio puede aparecer
 * y ser citado en Google, Bing, ChatGPT, Claude, Perplexity y Apple. Para bloquear alguno, sacarlo de la lista y agregar una
 * regla con su user agent y disallow "/". Revisar tambien el CDN/WAF: Cloudflare bloquea bots de IA por defecto.
 */
const SEARCH_AND_AI_BOTS = [
  "Googlebot",
  "Google-Extended",
  "Bingbot",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot",
  "Applebot-Extended",
  "DuckDuckBot",
];

export default function robots(): MetadataRoute.Robots {
  if (!env.indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      { userAgent: SEARCH_AND_AI_BOTS, allow: ["/", "/llms.txt", "/raw/"], disallow: ["/api/"] },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
