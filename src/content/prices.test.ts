import { describe, expect, it } from "vitest";
import { getPlanServices } from "@/features/catalog/services/catalog";
import type { Block, Doc } from "@/shared/lib/doc";
import { formatClp } from "@/shared/lib/format";
import { FALLBACK_FX, withIva } from "@/shared/lib/money";
import { getPageDoc, PAGE_KEYS, serviceDoc } from "./docs";

const fx = FALLBACK_FX;
const clp = (n: number) => formatClp(n, "es").replace(/\s/g, " ");
const plansOf = (doc: Doc) => doc.sections.flatMap((s) => s.blocks).filter((b): b is Extract<Block, { type: "plans" }> => b.type === "plans");

describe("montos del sitio: todos salen del catalogo y cuadran", () => {
  it("cada plan muestra precio = neto + IVA, y su detalle muestra ese mismo precio (sin desglose de IVA)", () => {
    for (const s of getPlanServices()) {
      const items = plansOf(serviceDoc("es", s, fx)).flatMap((b) => b.items);
      expect(items).toHaveLength(s.plans.length);
      s.plans.forEach((p, i) => {
        const item = items[i];
        expect(item?.price.replace(/\s/g, " ")).toBe(clp(withIva(p.priceClp)));
        const rows = item?.detail?.sections[0]?.rows ?? [];
        expect(rows.map(([, v]) => v.replace(/\s/g, " "))).toEqual([clp(withIva(p.priceClp))]);
        expect(JSON.stringify(item?.detail)).not.toMatch(/IVA/);
        // El cotizador recibe el mismo neto y el mismo precio.
        expect(item?.quote?.offer?.plan).toMatchObject({ net: p.priceClp, amount: withIva(p.priceClp) });
        if (p.sourceCodeClp !== undefined) expect(item?.quote?.offer?.code).toEqual({ net: p.sourceCodeClp, amount: withIva(p.sourceCodeClp) });
        for (const o of item?.quote?.offer?.support?.options ?? []) {
          const net = s.support[o.id];
          expect(o).toMatchObject({ net, amount: withIva(net ?? 0) });
        }
      });
    }
  });

  it("los textos informativos no hablan de IVA: solo el cotizador y los terminos lo mencionan", () => {
    for (const locale of ["es", "en"] as const) {
      for (const key of PAGE_KEYS.filter((k) => k !== "terms")) expect(JSON.stringify(getPageDoc(locale, key, fx)), `${locale} ${key}`).not.toMatch(/\b(IVA|VAT)\b/);
      for (const s of getPlanServices()) expect(JSON.stringify(serviceDoc(locale, s, fx)), `${locale} ${s.slug}`).not.toMatch(/\b(IVA|VAT)\b/);
    }
  });

  it("los textos legales citan montos calculados, sin marcas sin reemplazar", () => {
    const upfront = getPlanServices().find((s) => s.upfront)?.upfront?.priceClp ?? 0;
    const terms = JSON.stringify(getPageDoc("es", "terms", fx));
    expect(terms).toContain(`${clp(withIva(upfront))} (IVA incluido)`);
    for (const locale of ["es", "en"] as const) {
      for (const key of PAGE_KEYS) expect(JSON.stringify(getPageDoc(locale, key, fx)), `${locale} ${key}`).not.toMatch(/\{crmUpfront\}/);
    }
  });
});
