import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { contactSchema } from "./schemas/contact";
import { quoteSchema } from "./schemas/quote";
import { isRateLimited } from "./services/rate-limit";

const valid = {
  name: "Ana Pérez",
  email: "ana@empresa.cl",
  phoneCountry: "+56",
  phone: "951730743",
  service: "landing",
  message: "Necesitamos una landing page para una campaña.",
  consent: "on",
  locale: "es",
};

describe("contactSchema", () => {
  it("acepta una consulta valida", () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });
  it("el telefono y el mensaje son opcionales", () => {
    expect(contactSchema.safeParse({ ...valid, phone: undefined, message: undefined }).success).toBe(true);
  });
  it("exige consentimiento", () => {
    expect(contactSchema.safeParse({ ...valid, consent: undefined }).success).toBe(false);
  });
  it.each([
    ["email invalido", { email: "no-es-correo" }],
    ["nombre corto", { name: "A" }],
    ["mensaje demasiado largo", { message: "x".repeat(501) }],
    ["telefono chileno de 8 digitos", { phone: "12345678" }],
    ["telefono con letras", { phone: "9517abcde" }],
    ["prefijo fuera de la lista", { phoneCountry: "+999" }],
    ["servicio fuera de allowlist", { service: "hackear" }],
    ["idioma fuera de allowlist", { locale: "fr" }],
  ])("rechaza %s", (_name, patch) => {
    expect(contactSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it("descarta campos no declarados (mass assignment)", () => {
    const parsed = contactSchema.parse({ ...valid, role: "admin" });
    expect("role" in parsed).toBe(false);
  });
});

describe("isRateLimited", () => {
  it("bloquea al superar el limite dentro de la ventana y libera despues", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(isRateLimited("k", 3, 1000, t)).toBe(false);
    expect(isRateLimited("k", 3, 1000, t + 10)).toBe(true);
    expect(isRateLimited("k", 3, 1000, t + 2000)).toBe(false);
  });
});

describe("quoteSchema", () => {
  const quote = { name: "Ana Pérez", phoneCountry: "+56", phone: "951730743", service: "crm", message: "Necesito un CRM para mi equipo.", consent: true, plan: "Básico", locale: "es" };
  it("acepta una solicitud valida", () => {
    expect(quoteSchema.safeParse(quote).success).toBe(true);
  });
  it.each([
    ["sin nombre", { name: "" }],
    ["sin telefono", { phone: "" }],
    ["telefono chileno de 8 digitos", { phone: "12345678" }],
    ["sin mensaje", { message: "" }],
    ["mensaje de menos de 10 caracteres", { message: "hola" }],
    ["mensaje demasiado largo", { message: "x".repeat(501) }],
    ["servicio fuera de allowlist", { service: "hackear" }],
    ["plan demasiado largo", { plan: "x".repeat(61) }],
    ["sin aceptar terminos y politica de privacidad", { consent: false }],
  ])("rechaza %s", (_name, patch) => {
    expect(quoteSchema.safeParse({ ...quote, ...patch }).success).toBe(false);
  });
  it("todos los campos son obligatorios salvo el plan informativo", () => {
    for (const key of ["name", "phone", "service", "message", "phoneCountry", "locale", "consent"] as const) {
      expect(quoteSchema.safeParse({ ...quote, [key]: undefined }).success, key).toBe(false);
    }
    expect(quoteSchema.safeParse({ ...quote, plan: undefined }).success).toBe(true);
  });
});
