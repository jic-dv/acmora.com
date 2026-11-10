import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getFxRates } from "@/shared/lib/fx";
import { buildSearchIndex } from "@/shared/lib/search-index";

// Indice del buscador global: lo pide el cliente la primera vez que se abre el buscador (no pesa en la carga de la pagina).
export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return Response.json(buildSearchIndex(locale, await getFxRates()), {
    headers: { "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400", "x-robots-tag": "noindex" },
  });
}
