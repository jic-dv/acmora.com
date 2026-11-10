import { describe, expect, it } from "vitest";
import { buildSearchIndex } from "./search-index";
import { excerpt, fold, highlight, prepare, search, suggest, words, type SearchEntry } from "./search";
import { indexSchema } from "./search-schema";

const ENTRIES: SearchEntry[] = [
  { k: "page", t: "Precios", p: "Página", h: "/es/precios", x: "Precios claros en pesos chilenos para cada servicio y plan." },
  { k: "faq", t: "¿El precio incluye dominio y hosting?", p: "FAQ", h: "/es/preguntas-frecuentes#faq-el-precio", x: "Sí, los dos, desde el plan Básico. Compramos y configuramos el dominio por un año." },
  { k: "section", t: "Mantención mensual", p: "Precios", h: "/es/precios#h-mantencion", x: "Para extender el soporte cuando termina el período incluido. Sin permanencia mínima." },
];

describe("busqueda del sitio", () => {
  const index = prepare(ENTRIES);

  it("ignora tildes, mayusculas y palabras vacias", () => {
    expect(fold("Mantención")).toBe("mantencion");
    expect(words("¿Cuánto cuesta una Mantención?")).toEqual(["cuesta", "mantencion"]);
    expect(search(index, "MANTENCION").hits[0]?.entry.h).toBe("/es/precios#h-mantencion");
  });

  it("pone primero el titulo que coincide y exige todas las palabras", () => {
    const r = search(index, "dominio hosting");
    expect(r.partial).toBe(false);
    expect(r.hits.map((h) => h.entry.k)).toEqual(["faq"]);
    expect(search(index, "precio").hits[0]?.entry.k).toBe("page");
  });

  it("si ninguna entrada trae todas las palabras, muestra las que traen alguna y lo declara", () => {
    const r = search(index, "dominio soporte");
    expect(r.partial).toBe(true);
    expect(r.hits.length).toBe(2);
  });

  it("no devuelve nada para una palabra ajena y sugiere una correccion", () => {
    expect(search(index, "xqzvw").hits).toEqual([]);
    expect(suggest(index, "mantencon")).toBe("mantención");
    expect(suggest(index, "precios")).toBeNull();
  });

  it("resalta y extracta sin importar tildes", () => {
    expect(highlight("Mantención mensual", ["mantencion"]).filter((p) => p.hit).map((p) => p.text)).toEqual(["Mantención"]);
    const long = `${"palabra ".repeat(30)}dominio ${"final ".repeat(30)}`;
    const piece = excerpt(long, ["dominio"], 100);
    expect(piece).toContain("dominio");
    expect(piece.length).toBeLessThan(115);
  });
});

describe("indice del sitio", () => {
  for (const locale of ["es", "en"] as const) {
    it(`${locale}: cumple el esquema, trae paginas, servicios y preguntas, y cada destino es una ruta del idioma`, () => {
      const index = buildSearchIndex(locale);
      expect(indexSchema.safeParse(index).success).toBe(true);
      expect(index.some((e) => e.k === "faq")).toBe(true);
      expect(index.some((e) => e.k === "page" && e.h.includes("/landing-page"))).toBe(true);
      for (const e of index) {
        expect(e.h.startsWith(`/${locale}`), e.h).toBe(true);
        expect(e.t.length).toBeGreaterThan(0);
        expect(e.t + e.x, "sin guion largo ni medio").not.toMatch(/[–—]/);
      }
      expect(JSON.stringify(index).length).toBeLessThan(250_000);
    });
  }

  it("encuentra los temas mas buscados en espanol e ingles", () => {
    const es = prepare(buildSearchIndex("es"));
    const en = prepare(buildSearchIndex("en"));
    for (const q of ["precio", "plazo de entrega", "dominio y hosting", "mantención", "CRM", "cuotas"]) expect(search(es, q).hits.length, q).toBeGreaterThan(0);
    for (const q of ["price", "delivery time", "domain and hosting", "maintenance", "CRM", "installments"]) expect(search(en, q).hits.length, q).toBeGreaterThan(0);
  });
});
