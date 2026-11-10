import { describe, expect, it } from "vitest";
import { servicesMock } from "./services";
import { serviceSchema } from "@/features/catalog/schemas/service";

describe("el mock de servicios satisface el schema real", () => {
  it("cada servicio valida", () => {
    for (const s of servicesMock) expect(serviceSchema.safeParse(s).success, s.slug).toBe(true);
  });
  it("los slugs son unicos", () => {
    const slugs = servicesMock.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("los planes de cada servicio suben de precio, plazo y soporte incluido", () => {
    for (const s of servicesMock) {
      if (s.kind !== "plans") continue;
      const prices = s.plans.map((p) => p.priceClp);
      expect(prices, s.slug).toEqual([...prices].sort((a, b) => a - b));
      expect(s.plans.map((p) => p.supportMonths), s.slug).toEqual([1, 3, 6]);
    }
  });
  it("precios publicados en podiochile.com (revisados el 2026-11-04)", () => {
    const price = (slug: string) => servicesMock.find((s) => s.slug === slug && s.kind === "plans");
    const get = (slug: string) => (price(slug) && price(slug)?.kind === "plans" ? (price(slug) as Extract<(typeof servicesMock)[number], { kind: "plans" }>).plans.map((p) => p.priceClp) : []);
    expect(get("landing-page")).toEqual([220000, 340000, 490000]);
    expect(get("pagina-web-multipagina")).toEqual([420000, 590000, 790000]);
    expect(get("crm-personalizado")).toEqual([1200000, 1900000, 3400000]);
  });
});
