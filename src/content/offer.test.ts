import { describe, expect, it } from "vitest";
import { getService } from "@/features/catalog/services/catalog";
import { CAPACITY, capacityNow, monthKey } from "@/shared/constants/offer";
import type { Block } from "@/shared/lib/doc";
import { FALLBACK_FX } from "@/shared/lib/money";
import { getPageDoc, serviceDoc } from "./docs";

const docOf = (slug: string, locale: "es" | "en" = "es") => {
  const s = getService(slug);
  if (!s) throw new Error(slug);
  return serviceDoc(locale, s, FALLBACK_FX);
};
const blocks = (ids: string[], b: Block[]) => b.filter((x) => ids.includes(x.type));

describe("oferta: promesa, resultado medible, precio, garantia y cupos", () => {
  it("los cupos son reales: solo cuentan los tomados del mes en curso", () => {
    const sameMonth = new Date(`${CAPACITY.month}-15T12:00:00-03:00`);
    expect(monthKey(sameMonth)).toBe(CAPACITY.month);
    expect(capacityNow(sameMonth)).toEqual({ total: CAPACITY.perMonth, taken: CAPACITY.taken, left: CAPACITY.perMonth - CAPACITY.taken });
    // Otro mes: el registro ya no aplica y todos los cupos quedan libres.
    expect(capacityNow(new Date("2031-03-10T12:00:00-03:00"))).toEqual({ total: CAPACITY.perMonth, taken: 0, left: CAPACITY.perMonth });
  });

  it("cada servicio web sigue el orden: resultados, planes, garantias (4, con velocidad) y cupos", () => {
    const doc = docOf("landing-page");
    expect(doc.sections.slice(0, 4).map((s) => s.id)).toEqual(["resultados", "planes", "garantias", "cupos"]);
    const garantias = doc.sections.find((s) => s.id === "garantias")?.blocks[0];
    expect(garantias?.type === "cards" && garantias.items.map((i) => i.title)).toContain("Velocidad garantizada");
    expect(garantias?.type === "cards" && garantias.items).toHaveLength(4);
  });

  it("el CRM promete alcance y plazo por escrito, y no promete velocidad de PageSpeed", () => {
    const doc = docOf("crm-personalizado");
    const resultados = doc.sections.find((s) => s.id === "resultados")?.blocks[0];
    expect(resultados?.type === "cards" && resultados.items.map((i) => i.title)).toEqual(["Alcance por escrito", "Fecha de entrega por escrito"]);
    const garantias = doc.sections.find((s) => s.id === "garantias")?.blocks[0];
    expect(garantias?.type === "cards" && garantias.items.map((i) => i.title)).not.toContain("Velocidad garantizada");
  });

  it("los cupos dicen el mes y ofrecen el bono solo si quedan cupos; el cotizador recibe el mismo bono", () => {
    const cupos = blocks(["capacity"], docOf("landing-page").sections.flatMap((s) => s.blocks))[0];
    if (cupos?.type !== "capacity") throw new Error("sin cupos");
    expect(cupos.total).toBe(CAPACITY.perMonth);
    expect(cupos.heading).toMatch(/^Cupos de [a-záéíóúñ]+$/);
    const plans = blocks(["plans"], docOf("landing-page").sections.flatMap((s) => s.blocks))[0];
    const bonus = plans?.type === "plans" ? plans.items[0]?.quote?.offer?.bonus : undefined;
    if (cupos.taken < cupos.total) {
      expect(cupos.bonus).toMatch(/1 mes extra de soporte/);
      expect(bonus).toMatch(/1 mes extra de soporte/);
    } else {
      expect(cupos.bonus).toBeUndefined();
      expect(bonus).toBeUndefined();
    }
  });

  it("inicio y precios cierran con garantias y cupos antes de las preguntas; en ingles tambien", () => {
    for (const key of ["home", "pricing"] as const) {
      const ids = getPageDoc("es", key, FALLBACK_FX).sections.map((s) => s.id);
      expect(ids.indexOf("garantias")).toBeGreaterThan(-1);
      expect(ids.indexOf("cupos")).toBe(ids.indexOf("garantias") + 1);
    }
    const en = docOf("landing-page", "en").sections.find((s) => s.id === "cupos")?.blocks[0];
    expect(en?.type === "capacity" && en.heading).toMatch(/ slots$/);
  });
});
