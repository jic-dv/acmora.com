import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { PAGE_PATHNAME, type Doc, type DocAction, type PageKey } from "@/shared/lib/doc";
import { parseInline, resolveTarget } from "@/shared/lib/inline";
import { getServices } from "@/features/catalog/services/catalog";
import { FALLBACK_FX } from "@/shared/lib/money";
import { getCopy, getPageDoc, serviceDoc } from "./docs";

const KEYS = Object.keys(PAGE_PATHNAME) as PageKey[];

type Link = { label: string; title: string | undefined; target: string };

function inlineLinks(text: string): Link[] {
  return parseInline(text).flatMap((t) => (t.kind === "link" ? [{ label: t.text, title: t.title, target: t.target }] : []));
}

/** Todos los enlaces de un documento: inline, tarjetas, planes, acciones de seccion y banda final. */
function linksOf(doc: Doc): Link[] {
  const out: Link[] = [...inlineLinks(doc.lead)];
  const act = (a?: DocAction) => (a ? out.push({ label: a.label, title: a.title, target: a.href }) : undefined);
  for (const s of doc.sections) {
    if (s.intro) out.push(...inlineLinks(s.intro));
    act(s.action);
    for (const b of s.blocks) {
      switch (b.type) {
        case "p":
        case "note":
          out.push(...inlineLinks(b.text));
          break;
        case "ul":
        case "ol":
          b.items.forEach((i) => out.push(...inlineLinks(i)));
          break;
        case "dl":
          b.items.forEach((i) => out.push(...inlineLinks(i.desc)));
          break;
        case "table":
          b.rows.flat().forEach((c) => out.push(...inlineLinks(c)));
          break;
        case "cards":
          b.items.forEach((i) => i.href && out.push({ label: i.linkLabel ?? "", title: i.linkTitle, target: i.href }));
          break;
        case "plans":
          b.items.forEach((p) => out.push({ label: p.ctaLabel, title: p.ctaTitle, target: p.href }));
          break;
        case "steps":
        case "faq":
          break;
      }
    }
  }
  if (doc.cta) {
    act(doc.cta.primary);
    act(doc.cta.secondary);
  }
  return out;
}

describe.each(routing.locales)("contenido %s: SEO", (locale) => {
  const c = getCopy(locale);

  it.each(KEYS)("meta de %s: title 50-60 y description 140-160 caracteres", (key) => {
    const { title, description } = c.meta[key];
    expect(title.length, `title "${title}" (${title.length})`).toBeGreaterThanOrEqual(50);
    expect(title.length, `title "${title}" (${title.length})`).toBeLessThanOrEqual(60);
    expect(description.length, `description "${description}" (${description.length})`).toBeGreaterThanOrEqual(140);
    expect(description.length, `description "${description}" (${description.length})`).toBeLessThanOrEqual(160);
  });

  it("los title de meta no se repiten entre paginas", () => {
    const titles = KEYS.map((k) => c.meta[k].title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("toda pagina tiene h1 y secciones con id unico", () => {
    for (const key of KEYS) {
      const doc = getPageDoc(locale, key, FALLBACK_FX);
      expect(doc.title.length).toBeGreaterThan(10);
      const ids = doc.sections.map((s) => s.id);
      expect(new Set(ids).size, `ids repetidos en ${key}`).toBe(ids.length);
    }
  });

  it("todo enlace del contenido resuelve y declara un title descriptivo distinto del texto", () => {
    const docs = [...KEYS.map((k) => getPageDoc(locale, k, FALLBACK_FX)), ...getServices().map((s) => serviceDoc(locale, s, FALLBACK_FX))];
    for (const doc of docs) {
      for (const l of linksOf(doc)) {
        expect(() => resolveTarget(l.target, locale), `destino invalido: ${l.target}`).not.toThrow();
        expect(l.title, `enlace sin title: ${l.label}`).toBeTruthy();
        expect(l.title, `title duplicado del texto: ${l.label}`).not.toBe(l.label);
      }
    }
  });

  it("los title de navegacion son descriptivos y no repiten la etiqueta", () => {
    for (const key of KEYS) {
      expect(c.nav[key].title).not.toBe(c.nav[key].label);
      expect(c.nav[key].title.length).toBeGreaterThan(c.nav[key].label.length);
    }
  });
});

describe("rutas localizadas", () => {
  it("cada ruta tiene un valor distinto por idioma salvo las que coinciden por diseno", () => {
    const same = Object.entries(routing.pathnames)
      .filter(([, v]) => typeof v === "object" && v.es === v.en)
      .map(([k]) => k);
    expect(same.sort()).toEqual(["/cookies"]);
  });
});
