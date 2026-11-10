import { describe, expect, it } from "vitest";
import type { QuoteOffer } from "@/shared/lib/doc";
import { quoteSummary } from "./quote-offer";

// Montos tal como los arma el catalogo: neto en centenas y precio con IVA exacto (neto x 1,19).
const offer: QuoteOffer = {
  currency: "CLP",
  plan: { name: "Básico", amount: 261800, net: 220000, from: false },
  code: { amount: 95200, net: 80000 },
  support: {
    options: [
      { id: "m3", label: "3 meses", amount: 65331, net: 54900 },
      { id: "m6", label: "6 meses", amount: 118881, net: 99900 },
      { id: "y1", label: "1 año", amount: 224910, net: 189000 },
    ],
    monthly: 23681,
    benefits: [],
    conditions: [],
  },
};
const labels = { plan: "Plan", support: "Soporte", code: "Código fuente" };

describe("cotizacion en dos pasos", () => {
  it("sin opcionales, el total es el plan y el neto es el precio del catalogo", () => {
    const s = quoteSummary(offer, { support: null, code: false }, labels);
    expect(s.items).toHaveLength(1);
    expect(s).toMatchObject({ total: 261800, net: 220000, iva: 41800 });
  });
  it("suma soporte y codigo fuente: el neto es la suma de netos del catalogo, sin pesos fantasma", () => {
    const s = quoteSummary(offer, { support: "y1", code: true }, labels);
    expect(s.total).toBe(261800 + 224910 + 95200);
    expect(s.net).toBe(220000 + 189000 + 80000);
    expect(s.iva).toBe(Math.round((s.net * 19) / 100));
    expect(s.net + s.iva).toBe(s.total);
    expect(s.items.map((i) => i.key)).toEqual(["plan", "support", "code"]);
  });
  it("ignora opciones que el servicio no ofrece", () => {
    const s = quoteSummary({ ...offer, code: null, support: null }, { support: "m3", code: true }, labels);
    expect(s.total).toBe(261800);
  });
});
