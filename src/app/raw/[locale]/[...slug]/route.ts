import { hasLocale } from "next-intl";
import { getPageDoc, serviceDoc } from "@/content/docs";
import { getService } from "@/features/catalog/services/catalog";
import { routing } from "@/i18n/routing";
import { PAGE_PATHNAME, type Doc, type PageKey } from "@/shared/lib/doc";
import { env } from "@/shared/lib/env";
import { getFxRates } from "@/shared/lib/fx";
import { FALLBACK_FX } from "@/shared/lib/money";
import { docToMarkdown } from "@/shared/lib/markdown";
import { absoluteUrl, pathFor, type PageRef } from "@/shared/lib/seo";

const notFound = () => new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

// Version en texto plano (Markdown) de cada pagina: mismo contenido que el HTML, util para lectura
// directa y para sistemas de IA. Declara la pagina HTML como canonica y no se indexa por separado.
export async function GET(_req: Request, { params }: { params: Promise<{ locale: string; slug: string[] }> }) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return notFound();

  const joined = slug.join("/");
  if (!joined.endsWith(".md")) return notFound();
  const name = joined.slice(0, -3);

  let doc: Doc;
  let ref: PageRef;
  const serviceSlug = name.startsWith("services/") ? name.slice("services/".length) : null;
  if (serviceSlug) {
    const service = getService(serviceSlug);
    if (!service) return notFound();
    doc = serviceDoc(locale, service, await getFxRates());
    ref = { pathname: "/services/[slug]", slug: serviceSlug };
  } else {
    const key = (Object.keys(PAGE_PATHNAME) as PageKey[]).find((k) => (k === "home" ? name === "index" : PAGE_PATHNAME[k].slice(1) === name));
    if (!key) return notFound();
    doc = getPageDoc(locale, key, key === "home" || key === "pricing" || key === "services" ? await getFxRates() : FALLBACK_FX);
    ref = { pathname: PAGE_PATHNAME[key] as Exclude<(typeof PAGE_PATHNAME)[PageKey], "/services/[slug]"> };
  }

  const canonical = absoluteUrl(pathFor(locale, ref));
  return new Response(docToMarkdown(doc, locale, env.NEXT_PUBLIC_SITE_URL, canonical), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "x-robots-tag": "noindex, follow",
      link: `<${canonical}>; rel="canonical"`,
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
