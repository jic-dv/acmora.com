"use server";

import { headers } from "next/headers";
import { contactSchema } from "./schemas/contact";
import { quoteSchema } from "./schemas/quote";
import type { ContactField, ContactState, ContactValues, QuoteField, QuoteState, QuoteValues } from "./state";
import { DeliveryUnavailableError, deliverLead, deliverQuote } from "./services/deliver";
import { isRateLimited } from "./services/rate-limit";

const MIN_FILL_MS = 3000;
const FIELDS: ContactField[] = ["name", "email", "phone", "service", "message", "consent"];

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

// Las Server Actions son endpoints publicos: todo se valida aqui, nunca se confia en el cliente.
export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const values: ContactValues = {
    name: text(formData, "name"),
    email: text(formData, "email"),
    phoneCountry: text(formData, "phoneCountry"),
    phone: text(formData, "phone"),
    service: text(formData, "service"),
    message: text(formData, "message"),
  };

  // Anti-bots: honeypot y tiempo minimo de llenado. Se responde como exito para no informar al bot.
  const startedAt = Number(text(formData, "startedAt"));
  const tooFast = !Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_MS;
  if (text(formData, "website") !== "" || tooFast) return { status: "success" };

  const parsed = contactSchema.safeParse({
    ...values,
    phone: values.phone || undefined,
    message: values.message || undefined,
    consent: text(formData, "consent") || undefined,
    locale: text(formData, "locale"),
  });
  if (!parsed.success) {
    const failed = new Set(parsed.error.issues.map((i) => String(i.path[0])));
    return { status: "error", code: "invalid", fields: FIELDS.filter((f) => failed.has(f)), values };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const limited =
    isRateLimited(`ip:${ip}`, 5, 15 * 60_000) || isRateLimited(`email:${parsed.data.email.toLowerCase()}`, 3, 60 * 60_000);
  if (limited) return { status: "error", code: "rate", fields: [], values };

  try {
    await deliverLead(parsed.data);
    return { status: "success" };
  } catch (error) {
    // Registro de servidor sin datos personales; al cliente solo llega un codigo generico.
    console.error("[contact] fallo el envio", error instanceof Error ? error.message : "desconocido");
    return { status: "error", code: error instanceof DeliveryUnavailableError ? "unavailable" : "generic", fields: [], values };
  }
}

const QUOTE_FIELDS: QuoteField[] = ["name", "phone", "service", "message", "consent"];

export async function submitQuote(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  const values: QuoteValues = {
    name: text(formData, "name"),
    phoneCountry: text(formData, "phoneCountry"),
    phone: text(formData, "phone"),
    service: text(formData, "service"),
    message: text(formData, "message"),
    consent: formData.get("consent") === "on",
  };

  const startedAt = Number(text(formData, "startedAt"));
  const tooFast = !Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_MS;
  if (text(formData, "website") !== "" || tooFast) return { status: "success" };

  const parsed = quoteSchema.safeParse({ ...values, plan: text(formData, "plan") || undefined, locale: text(formData, "locale") });
  if (!parsed.success) {
    const failed = new Set(parsed.error.issues.map((i) => String(i.path[0])));
    return { status: "error", code: "invalid", fields: QUOTE_FIELDS.filter((f) => failed.has(f)), values };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const phoneKey = `${parsed.data.phoneCountry}${parsed.data.phone}`;
  if (isRateLimited(`quote-ip:${ip}`, 5, 15 * 60_000) || isRateLimited(`quote-phone:${phoneKey}`, 3, 60 * 60_000)) {
    return { status: "error", code: "rate", fields: [], values };
  }

  try {
    await deliverQuote(parsed.data);
    return { status: "success" };
  } catch (error) {
    console.error("[quote] fallo el envio", error instanceof Error ? error.message : "desconocido");
    return { status: "error", code: error instanceof DeliveryUnavailableError ? "unavailable" : "generic", fields: [], values };
  }
}
