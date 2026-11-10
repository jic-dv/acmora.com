import { getCopy } from "@/content/docs";
import { getServices } from "@/features/catalog/services/catalog";
import { COMPANY } from "@/shared/constants/site";
import { routing } from "@/i18n/routing";
import { PAGE_PATHNAME, type PageKey } from "@/shared/lib/doc";
import { env } from "@/shared/lib/env";
import { absoluteUrl, pathFor } from "@/shared/lib/seo";

// llms.txt (llmstxt.org): indice para buscadores con IA y agentes. Cada pagina con su descripcion, la version HTML y la
// version en texto plano (/raw/{idioma}/{ruta}.md), que es el mismo contenido sin interfaz. Se arma desde las mismas rutas
// y textos del sitio. Sin indexacion habilitada no se publica.
export function GET() {
  if (!env.indexable) return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });

  const es = getCopy("es");
  const keys = Object.keys(PAGE_PATHNAME) as PageKey[];
  const raw = (locale: string, path: string) => absoluteUrl(`/raw/${locale}/${path}.md`);

  const lines = [`# ${COMPANY.name}`, "", `> ${es.meta.home.description}`, ""];
  for (const locale of routing.locales) {
    const c = getCopy(locale);
    const plain = locale === "es" ? "Texto plano" : "Plain text";
    lines.push(`## ${locale === "es" ? "Español" : "English"}`, "");
    for (const key of keys) {
      const ref = { pathname: PAGE_PATHNAME[key] as Exclude<(typeof PAGE_PATHNAME)[PageKey], "/services/[slug]"> };
      const md = key === "home" ? "index" : PAGE_PATHNAME[key].slice(1);
      lines.push(`- [${c.meta[key].title}](${absoluteUrl(pathFor(locale, ref))}): ${c.meta[key].description} ${plain}: ${raw(locale, md)}`);
    }
    for (const s of getServices()) {
      const url = absoluteUrl(pathFor(locale, { pathname: "/services/[slug]", slug: s.slug }));
      lines.push(`- [${s.meta.title[locale]}](${url}): ${s.meta.description[locale]} ${plain}: ${raw(locale, `services/${s.slug}`)}`);
    }
    lines.push("");
  }
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600" } });
}
