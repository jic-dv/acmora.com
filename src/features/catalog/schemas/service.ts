import { z } from "@/shared/lib/z";
import { ICON_NAMES } from "@/shared/constants/icons";
import { localized } from "@/shared/lib/localized";

const text = localized(z.string().min(1));

/** Celda de la tabla comparativa: "yes" = Incluido, "no" = No incluido, o un texto por idioma. */
export const cellSchema = z.union([z.enum(["yes", "no"]), text]);

export const planSchema = z.object({
  id: z.enum(["basico", "estandar", "premium"]),
  name: text,
  /** CLP sin IVA. */
  priceClp: z.number().int().positive(),
  /** true: el precio publicado es "desde" (el valor firme sale del levantamiento). */
  from: z.boolean().default(false),
  deliveryDays: text,
  revisions: z.number().int().positive(),
  /** Meses de soporte incluidos en el proyecto. */
  supportMonths: z.number().int().positive(),
  recommended: z.boolean().optional(),
  includes: z.array(text).min(4),
  /** Precio neto (CLP sin IVA) de comprar el codigo fuente aparte. Ausente = se cotiza. El codigo NO se entrega con el plan. */
  sourceCodeClp: z.number().int().positive().optional(),
});

/** Precio de extender el soporte, en CLP sin IVA (al publico se muestra con IVA, ver `withIva`). null = a cotizar. */
export const supportSchema = z.object({
  m3: z.number().int().positive().nullable(),
  m6: z.number().int().positive().nullable(),
  y1: z.number().int().positive().nullable(),
  monthly: z.number().int().positive().nullable(),
});

const base = {
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  icon: z.enum(ICON_NAMES),
  group: z.enum(["web", "apps", "care"]),
  name: text,
  tagline: text,
  summary: text,
  /** Metadata SEO propia: title 50-60 y description 140-160 caracteres. */
  meta: z.object({
    title: localized(z.string().min(50).max(60)),
    description: localized(z.string().min(140).max(160)),
  }),
};

export const planServiceSchema = z.object({
  ...base,
  kind: z.literal("plans"),
  popular: z.boolean().optional(),
  intro: z.array(text).min(2),
  receive: z.array(text).min(5),
  idealFor: z.array(text).min(3),
  steps: z.array(z.object({ title: text, text })).length(4),
  tech: z.array(z.string()).min(3),
  faq: z.array(z.object({ q: text, a: text })).min(2),
  plans: z.array(planSchema).length(3),
  support: supportSchema,
  compare: z.array(z.object({ label: text, cells: z.array(cellSchema).length(3) })).min(10),
  /** Levantamiento previo pagado (CRM): se descuenta del valor del proyecto. */
  upfront: z.object({ name: text, priceClp: z.number().int().positive(), duration: text, includes: text }).optional(),
});

export const supportServiceSchema = z.object({ ...base, kind: z.literal("support") });

export const serviceSchema = z.discriminatedUnion("kind", [planServiceSchema, supportServiceSchema]);

export type Plan = z.infer<typeof planSchema>;
export type Support = z.infer<typeof supportSchema>;
export type Cell = z.infer<typeof cellSchema>;
export type PlanService = z.infer<typeof planServiceSchema>;
export type SupportService = z.infer<typeof supportServiceSchema>;
export type Service = z.infer<typeof serviceSchema>;
