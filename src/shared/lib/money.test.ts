import { describe, expect, it } from "vitest";
import { getPlanServices } from "@/features/catalog/services/catalog";
import { breakdown, formatPlanPrice, ivaOf, planAmount, withIva, type FxRates } from "./money";

const fx: FxRates = { usdClp: 980, ufClp: 41000, date: "2026-11-04", live: true };

describe("IVA 19% exacto sobre precios netos", () => {
  it("precio al publico = neto + IVA exacto, sin redondeos agregados", () => {
    expect(withIva(220000)).toBe(261800);
    expect(ivaOf(220000)).toBe(41800);
    expect(withIva(54900)).toBe(65331);
    expect(withIva(189000)).toBe(224910);
    expect(withIva(19900)).toBe(23681);
  });

  it("todos los montos del catalogo estan en centenas: el IVA sale entero, sin decimales que redondear", () => {
    for (const s of getPlanServices()) {
      const nets = [
        ...s.plans.flatMap((p) => [p.priceClp, p.sourceCodeClp ?? 0]),
        ...[s.support.m3, s.support.m6, s.support.y1, s.support.monthly].map((n) => n ?? 0),
        s.upfront?.priceClp ?? 0,
      ];
      for (const net of nets) {
        expect(net % 100, `${s.slug}: ${net}`).toBe(0);
        expect((net * 19) % 100, `${s.slug}: ${net}`).toBe(0);
      }
    }
  });

  it("el desglose en pesos devuelve el neto del catalogo y cuadra (neto + IVA = total)", () => {
    expect(breakdown(220000, "es", fx)).toEqual({ net: 220000, iva: 41800, total: 261800, currency: "CLP" });
    expect(breakdown(54900, "es", fx)).toEqual({ net: 54900, iva: 10431, total: 65331, currency: "CLP" });
  });

  it("en dolares tambien cuadra: el IVA es la diferencia entre total y neto convertidos", () => {
    const b = breakdown(220000, "en", fx);
    expect(b).toEqual({ net: 224, iva: 43, total: 267, currency: "USD" });
    expect(b.net + b.iva).toBe(b.total);
  });
});

describe("precios por idioma", () => {
  it("espanol: pesos con IVA incluido", () => {
    expect(formatPlanPrice(1490000, "es", fx).replace(/\s/g, " ")).toBe("$1.773.100");
  });
  it("ingles: dolares al cambio vigente, al dolar entero (sin redondeo comercial)", () => {
    // 1.490.000 + IVA = 1.773.100 / 980 = 1809,3 -> 1809
    expect(formatPlanPrice(1490000, "en", fx)).toBe("$1,809");
  });
  it("el monto numerico para datos estructurados sigue la misma moneda", () => {
    expect(planAmount(3900000, "en", fx)).toEqual({ amount: 4736, currency: "USD" });
    expect(planAmount(3900000, "es", fx)).toEqual({ amount: 4641000, currency: "CLP" });
  });
  it("si el dolar cambia, el precio cambia", () => {
    expect(planAmount(1490000, "en", { ...fx, usdClp: 1100 }).amount).toBe(1612);
  });
});
