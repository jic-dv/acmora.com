import { COUNTRY_CODES, SERVICE_OPTIONS, type QuoteField, type QuoteValues } from "./state";

/** Rotulos del mensaje (ya en el idioma de la pagina). */
export type QuoteShareLabels = {
  subject: string;
  greeting: string;
  service: string;
  plan: string;
  name: string;
  phone: string;
  project: string;
  /** Constancia de la aceptacion de terminos y politica de privacidad. */
  consent: string;
  /** Rotulo del bloque de precios del paso 2. */
  detail: string;
  support: string;
  noSupport: string;
  code: string;
  noCode: string;
  monthly: string;
  net: string;
  iva: string;
  total: string;
  footer: string;
};

/** Mismas reglas que `quoteSchema`, sin Zod para no cargarlo en el cliente: todos los campos son obligatorios. */
export function validateQuote(v: QuoteValues): QuoteField[] {
  const failed: QuoteField[] = [];
  if (v.name.trim().length < 2 || v.name.trim().length > 100) failed.push("name");
  const digits = v.phone.trim();
  const phoneOk = /^\d+$/.test(digits) && digits.length <= 12 && (v.phoneCountry === "+56" ? digits.length === 9 : digits.length >= 6) && COUNTRY_CODES.some((c) => c === v.phoneCountry);
  if (!phoneOk) failed.push("phone");
  if (!SERVICE_OPTIONS.some((s) => s === v.service)) failed.push("service");
  if (v.message.trim().length < 10 || v.message.trim().length > 500) failed.push("message");
  if (!v.consent) failed.push("consent");
  return failed;
}

type Parts = {
  labels: QuoteShareLabels;
  serviceName: string;
  plan: string;
  values: QuoteValues;
  /** Lineas ya redactadas del detalle de precios (paso 2); vacio en una cotizacion general. */
  detail?: string[];
};

/** Asunto y cuerpo con todo el detalle de la solicitud y los datos de contacto, listos para correo o WhatsApp. */
export function buildQuoteMessage({ labels, serviceName, plan, values, detail = [] }: Parts) {
  const name = values.name.trim();
  const phone = `${values.phoneCountry} ${values.phone.trim()}`;
  const lines = [
    labels.greeting,
    "",
    `${labels.service}: ${serviceName}`,
    ...(plan ? [`${labels.plan}: ${plan}`] : []),
    `${labels.name}: ${name}`,
    `${labels.phone}: ${phone}`,
    ...(detail.length > 0 ? ["", `${labels.detail}:`, ...detail] : []),
    "",
    `${labels.project}:`,
    values.message.trim(),
    "",
    labels.consent,
    labels.footer,
  ];
  return {
    subject: `${labels.subject}: ${serviceName}${plan ? ` - ${plan}` : ""} - ${name}`,
    body: lines.join("\n"),
  };
}

export const mailtoUrl = (email: string, m: { subject: string; body: string }) => `mailto:${email}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;

export const whatsappUrl = (base: string, m: { body: string }) => `${base}?text=${encodeURIComponent(m.body)}`;
