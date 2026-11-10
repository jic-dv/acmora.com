import "server-only";
import { COMPANY, LEGAL_VERSION } from "@/shared/constants/site";
import { serverEnv } from "@/shared/lib/env.server";
import type { ContactInput } from "../schemas/contact";
import type { QuoteInput } from "../schemas/quote";

export class DeliveryUnavailableError extends Error {}

type Lead = Record<string, unknown> & { service: string; locale: string };

/** Registro de consentimiento: version de la politica, fecha y origen (Ley 21.719, responsabilidad demostrable). */
function contactLead(input: ContactInput): Lead {
  return {
    to: COMPANY.email,
    subject: `Nueva consulta de ${input.name}`,
    name: input.name,
    email: input.email,
    phone: input.phone ? `${input.phoneCountry}${input.phone}` : null,
    service: input.service,
    message: input.message ?? null,
    locale: input.locale,
    consent: {
      given: true,
      at: new Date().toISOString(),
      policyVersion: LEGAL_VERSION.version,
      locale: input.locale,
      source: "contact-form",
    },
  };
}

/** El dialogo no tiene casilla: se registra que se mostro el aviso de privacidad (version y fecha). */
function quoteLead(input: QuoteInput): Lead {
  return {
    to: COMPANY.email,
    subject: `Cotizacion${input.plan ? ` plan ${input.plan}` : ""}: ${input.name}`,
    name: input.name,
    phone: `${input.phoneCountry}${input.phone}`,
    service: input.service,
    plan: input.plan ?? null,
    message: input.message,
    locale: input.locale,
    privacyNotice: { shown: true, at: new Date().toISOString(), policyVersion: LEGAL_VERSION.version, source: "quote-dialog" },
  };
}

async function deliver(lead: Lead): Promise<void> {
  if (serverEnv.CONTACT_WEBHOOK_URL) {
    const res = await fetch(serverEnv.CONTACT_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Webhook de contacto respondio ${res.status}`);
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    // Sin webhook solo se acepta en desarrollo, y sin volcar datos personales al log.
    console.info("[contact] consulta recibida (modo desarrollo, sin webhook)", { service: lead.service, locale: lead.locale });
    return;
  }

  throw new DeliveryUnavailableError("CONTACT_WEBHOOK_URL no esta configurada");
}

export const deliverLead = (input: ContactInput) => deliver(contactLead(input));
export const deliverQuote = (input: QuoteInput) => deliver(quoteLead(input));
