import { describe, expect, it } from "vitest";
import { buildQuoteMessage, mailtoUrl, validateQuote, whatsappUrl } from "./quote-message";

const labels = { subject: "Solicitud de cotización", greeting: "Hola, quiero cotizar el siguiente servicio:", service: "Servicio", plan: "Plan", name: "Nombre o empresa", phone: "Teléfono", project: "Sobre el proyecto", consent: "Acepté los Términos y Condiciones y la Política de Privacidad.", detail: "Detalle de la cotización (precios con IVA incluido)", support: "Soporte adicional", noSupport: "Sin soporte adicional", code: "Código fuente", noCode: "Sin código fuente", monthly: "Soporte mes a mes", net: "Valor neto", iva: "IVA (19%)", total: "Total con IVA incluido", footer: "Enviado desde el sitio de Acmora." };
const values = { name: " Ana Pérez ", phoneCountry: "+56", phone: "951730743", service: "crm", message: "Necesito un CRM para mi equipo de ventas.", consent: true };

describe("validateQuote", () => {
  it("acepta una solicitud completa", () => {
    expect(validateQuote(values)).toEqual([]);
  });
  it("acepta un nombre de exactamente 60 caracteres", () => {
    expect(validateQuote({ ...values, name: "x".repeat(60) })).toEqual([]);
  });
  it("marca todos los campos vacios como obligatorios", () => {
    expect(validateQuote({ name: "", phoneCountry: "+56", phone: "", service: "", message: "", consent: false })).toEqual(["name", "phone", "service", "message", "consent"]);
  });
  it.each([
    ["telefono chileno de 8 digitos", { phone: "12345678" }, "phone"],
    ["telefono con letras", { phone: "9517abcde" }, "phone"],
    ["prefijo fuera de la lista", { phoneCountry: "+999" }, "phone"],
    ["servicio fuera de la lista", { service: "hackear" }, "service"],
    ["nombre de mas de 60 caracteres", { name: "x".repeat(61) }, "name"],
    ["mensaje de menos de 10 caracteres", { message: "hola" }, "message"],
    ["mensaje de mas de 500", { message: "x".repeat(501) }, "message"],
    ["sin aceptar terminos y politica de privacidad", { consent: false }, "consent"],
  ])("rechaza %s", (_n, patch, field) => {
    expect(validateQuote({ ...values, ...patch })).toEqual([field]);
  });
});

describe("buildQuoteMessage", () => {
  const m = buildQuoteMessage({ labels, serviceName: "CRM Personalizado", plan: "Premium", values });
  it("incluye servicio, plan, contacto y detalle del proyecto, bien ordenados", () => {
    expect(m.subject).toBe("Solicitud de cotización: CRM Personalizado - Premium - Ana Pérez");
    expect(m.body).toBe(
      [
        "Hola, quiero cotizar el siguiente servicio:",
        "",
        "Servicio: CRM Personalizado",
        "Plan: Premium",
        "Nombre o empresa: Ana Pérez",
        "Teléfono: +56 951730743",
        "",
        "Sobre el proyecto:",
        "Necesito un CRM para mi equipo de ventas.",
        "",
        "Acepté los Términos y Condiciones y la Política de Privacidad.",
        "Enviado desde el sitio de Acmora.",
      ].join("\n"),
    );
  });
  it("las URL codifican el texto y apuntan al destino correcto", () => {
    const mail = mailtoUrl("contact@acmora.com", m);
    expect(mail.startsWith("mailto:contact@acmora.com?subject=")).toBe(true);
    expect(decodeURIComponent(mail.split("&body=")[1] ?? "")).toBe(m.body);
    const wa = whatsappUrl("https://wa.me/56951730743", m);
    expect(wa.startsWith("https://wa.me/56951730743?text=")).toBe(true);
    expect(decodeURIComponent(wa.split("?text=")[1] ?? "")).toBe(m.body);
  });
  it("agrega el detalle de precios entre los datos y el proyecto cuando hay cotizacion", () => {
    const body = buildQuoteMessage({ labels, serviceName: "Landing Page", plan: "Básico", values, detail: ["- Plan: Básico: $261.800", "- Total con IVA incluido: $261.800"] }).body;
    const lines = body.split(String.fromCharCode(10));
    expect(lines.indexOf("Detalle de la cotización (precios con IVA incluido):")).toBeGreaterThan(lines.indexOf("Teléfono: +56 951730743"));
    expect(lines.indexOf("Detalle de la cotización (precios con IVA incluido):")).toBeLessThan(lines.indexOf("Sobre el proyecto:"));
    expect(body).toContain("- Total con IVA incluido: $261.800");
  });
  it("omite la linea del plan si no hay plan", () => {
    expect(buildQuoteMessage({ labels, serviceName: "Landing Page", plan: "", values }).body).not.toContain("Plan:");
  });
});
