import { describe, expect, it } from "vitest";
import { getServices } from "@/features/catalog/services/catalog";
import { KEYWORDS, keywordsFor, SERVICE_KEYWORDS } from "@/shared/constants/keywords";
import { getCopy } from "./docs";

describe("SEO: titulos, descripciones y palabras clave", () => {
  for (const locale of ["es", "en"] as const) {
    it(`${locale}: cada titulo mide 50 a 60 caracteres y cada descripcion 140 a 160, sin mencionar un pais`, () => {
      const metas = [...Object.values(getCopy(locale).meta), ...getServices().map((s) => ({ title: s.meta.title[locale], description: s.meta.description[locale] }))];
      for (const m of metas) {
        expect(m.title.length, m.title).toBeGreaterThanOrEqual(50);
        expect(m.title.length, m.title).toBeLessThanOrEqual(60);
        expect(m.description.length, m.description).toBeGreaterThanOrEqual(140);
        expect(m.description.length, m.description).toBeLessThanOrEqual(160);
        expect(`${m.title} ${m.description}`, m.title).not.toMatch(/\b(en|in) Chile\b/);
      }
    });

    it(`${locale}: la portada y cada servicio usan sus palabras clave principales en el titulo o la descripcion`, () => {
      const home = getCopy(locale).meta.home;
      expect(`${home.title} ${home.description}`.toLowerCase()).toMatch(locale === "es" ? /agencia de desarrollo|desarrollo de páginas web/ : /development agency|website/);
      for (const s of getServices()) {
        const group = SERVICE_KEYWORDS[s.slug];
        expect(group, s.slug).toBeDefined();
        const kw = keywordsFor(locale, group ?? "general");
        expect(kw).toContain("Acmora");
        expect(new Set(kw).size).toBe(kw.length);
      }
    });
  }

  it("las palabras clave incluyen las busquedas pedidas por el cliente", () => {
    const all = [...KEYWORDS.es.brand, ...KEYWORDS.es.general, ...KEYWORDS.es.landing, ...KEYWORDS.es.crm].map((k) => k.toLowerCase());
    for (const k of ["acmora", "acmora desarrollo web", "acmora software", "desarrollo web", "desarrollo de software a medida", "desarrollo de páginas web", "desarrollo de landing pages", "desarrollo de crm", "crm personalizado", "crms para empresas", "servicios de páginas web", "servicios de desarrollo de software"]) {
      expect(all, k).toContain(k);
    }
  });
});
