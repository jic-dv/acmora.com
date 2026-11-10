import type { Locale } from "@/i18n/routing";
import { getCopy, getPageDoc, PAGE_KEYS, serviceDoc } from "@/content/docs";
import { getServices } from "@/features/catalog/services/catalog";
import { PAGE_PATHNAME, type Block, type Doc, type PageKey } from "@/shared/lib/doc";
import { faqId } from "@/shared/lib/faq-id";
import { parseInline } from "@/shared/lib/inline";
import { FALLBACK_FX, type FxRates } from "@/shared/lib/money";
import type { SearchEntry } from "@/shared/lib/search";
import { pathFor } from "@/shared/lib/seo";

const MAX_TEXT = 1500;

/** Texto sin la sintaxis inline ([texto|title](destino), **negrita**, `codigo`). */
const plain = (s: string) =>
  parseInline(s)
    .map((t) => t.text)
    .join("");

const squash = (parts: (string | undefined)[]) =>
  parts
    .filter((p): p is string => Boolean(p))
    .map(plain)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

function blockText(b: Block): string[] {
  switch (b.type) {
    case "p":
    case "note":
      return [b.text];
    case "ul":
    case "ol":
      return b.items;
    case "dl":
      return b.items.flatMap((i) => [i.term, i.desc]);
    case "steps":
    case "timeline":
    case "cards":
      return b.items.flatMap((i) => [i.title, i.text]);
    case "table":
      return [b.caption, ...b.head, ...b.rows.flat()];
    case "faq":
      return b.items.flatMap((i) => [i.q, i.a]);
    case "capacity":
      return [b.heading, b.status, b.text, b.bonus ?? ""];
    case "overview":
      return [b.text, b.heading, ...b.items];
    case "plans":
      return b.items.flatMap((p) => [
        p.name,
        p.price,
        p.priceNote,
        p.audience,
        p.timeframe,
        ...p.includes,
        ...(p.detail?.sections.flatMap((s) => [s.heading, s.text ?? "", ...(s.items ?? []), ...(s.rows ?? []).flat()]) ?? []),
      ]);
    case "tabs":
      return b.items.flatMap((t) => [t.label, ...t.blocks.flatMap(blockText)]);
    case "projects":
      return b.items.flatMap((p) => [p.title, p.description, ...p.tags]);
    case "columns":
      return b.items.flatMap((c) => [c.heading, c.text, ...c.links.map((l) => l.label)]);
    case "feature":
      return [b.heading, ...b.highlights.map((h) => h.label)];
    case "iconrow":
      return [b.heading, ...b.items.flatMap((i) => [i.label, i.text])];
  }
}

type Options = { sections: boolean; faq: boolean };

function entriesOf(doc: Doc, path: string, title: string, label: string, kind: string, opts: Options): SearchEntry[] {
  const out: SearchEntry[] = [{ k: "page", t: title, p: kind, h: path, x: squash([doc.lead, ...doc.sections.map((s) => s.heading)]).slice(0, MAX_TEXT) }];
  if (!opts.sections) return out;
  for (const s of doc.sections) {
    out.push({
      k: "section",
      t: s.heading,
      p: label,
      h: s.bare ? path : `${path}#h-${s.id}`,
      x: squash([s.intro, ...s.blocks.flatMap(blockText)]).slice(0, MAX_TEXT),
    });
    if (!opts.faq) continue;
    for (const b of s.blocks) {
      if (b.type !== "faq") continue;
      for (const item of b.items) out.push({ k: "faq", t: item.q, p: label, h: `${path}#${faqId(item.q)}`, x: squash([item.a]).slice(0, MAX_TEXT) });
    }
  }
  return out;
}

const cache = new Map<string, SearchEntry[]>();

/**
 * Indice de busqueda de todo el sitio en un idioma: cada pagina, cada seccion (con su texto) y cada pregunta frecuente, mas las
 * paginas de servicio. Se arma desde los mismos documentos que el HTML y con el mismo tipo de cambio que las paginas, asi los
 * precios del buscador son exactamente los publicados. La portada solo aporta la pagina (sus secciones repiten otras).
 */
export function buildSearchIndex(locale: Locale, fx: FxRates = FALLBACK_FX): SearchEntry[] {
  const key = `${locale}:${fx.usdClp}:${fx.date}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const c = getCopy(locale);
  const out: SearchEntry[] = [];
  for (const key of PAGE_KEYS) {
    const doc = getPageDoc(locale, key, fx);
    const path = pathFor(locale, { pathname: PAGE_PATHNAME[key] as Exclude<(typeof PAGE_PATHNAME)[PageKey], "/services/[slug]"> });
    const label = c.nav[key].label;
    out.push(...entriesOf(doc, path, label, label, c.ui.search.kinds.page, { sections: key !== "home", faq: key === "faq" }));
  }
  for (const s of getServices()) {
    const path = pathFor(locale, { pathname: "/services/[slug]", slug: s.slug });
    const name = s.name[locale];
    out.push(...entriesOf(serviceDoc(locale, s, fx), path, name, name, c.ui.search.kinds.service, { sections: true, faq: false }));
  }
  cache.set(key, out);
  return out;
}
