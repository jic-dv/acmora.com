import { z } from "@/shared/lib/z";
import { routing } from "@/i18n/routing";
import { COUNTRY_CODES, SERVICE_OPTIONS } from "../state";

/** Dialogo de cotizacion: nombre o empresa, telefono, servicio y proyecto, todos obligatorios. */
export const quoteSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    phoneCountry: z.enum(COUNTRY_CODES as [string, ...string[]]),
    // Solo digitos, sin el prefijo del pais.
    phone: z.string().trim().regex(/^\d+$/).max(12),
    service: z.enum(SERVICE_OPTIONS),
    message: z.string().trim().min(10).max(500),
    // Aceptacion expresa de terminos y politica de privacidad (Ley 21.719): sin ella no se procesa la solicitud.
    consent: z.literal(true),
    // Plan desde el que se abrio el dialogo (informativo, no determina precio).
    plan: z.string().trim().max(60).optional(),
    locale: z.enum(routing.locales),
  })
  .superRefine((v, ctx) => {
    // Chile: 9 digitos. Resto: entre 6 y 12.
    const ok = v.phoneCountry === "+56" ? v.phone.length === 9 : v.phone.length >= 6;
    if (!ok) ctx.addIssue({ code: "custom", path: ["phone"], message: "telefono invalido" });
  });

export type QuoteInput = z.infer<typeof quoteSchema>;
