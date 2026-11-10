import { z } from "@/shared/lib/z";
import { routing } from "@/i18n/routing";
import { COUNTRY_CODES, SERVICE_OPTIONS } from "../state";

/** Fuente de verdad del formulario: la usan el servidor (validacion) y el cliente (tipos de estado). */
export const contactSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.email().max(160),
    phoneCountry: z.enum(COUNTRY_CODES as [string, ...string[]]),
    // Opcional. Solo digitos, sin el prefijo del pais.
    phone: z.string().trim().regex(/^\d*$/).max(12).optional(),
    service: z.enum(SERVICE_OPTIONS),
    message: z.string().trim().max(500).optional(),
    // Un checkbox marcado llega como "on". Sin marcar, el campo no llega.
    consent: z.literal("on"),
    locale: z.enum(routing.locales),
  })
  .superRefine((v, ctx) => {
    if (!v.phone) return;
    // Chile: 9 digitos. Resto: entre 6 y 12.
    const ok = v.phoneCountry === "+56" ? v.phone.length === 9 : v.phone.length >= 6;
    if (!ok) ctx.addIssue({ code: "custom", path: ["phone"], message: "telefono invalido" });
  });

export type ContactInput = z.infer<typeof contactSchema>;
