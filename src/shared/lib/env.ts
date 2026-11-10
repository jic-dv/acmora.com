import { z } from "@/shared/lib/z";

const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z
    .url()
    .refine((v) => !v.endsWith("/"), "Sin barra final")
    .default("http://localhost:3000"),
  // El sitio se publica con noindex hasta que se confirme explicitamente (contenido de ejemplo, previews).
  NEXT_PUBLIC_INDEXING_ENABLED: z.enum(["true", "false"]).default("false"),
});

/**
 * URL publica y canonica. Manda NEXT_PUBLIC_SITE_URL (el dominio propio, configurado en el proyecto). Si falta y el sitio se
 * compila en Vercel, se usa el dominio de produccion que Vercel entrega en sus variables de sistema
 * (VERCEL_PROJECT_PRODUCTION_URL, disponible al compilar y al ejecutar, sin protocolo): asi el build nunca cae por esto y el
 * canonical apunta siempre a produccion, tambien en las vistas previas.
 */
const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || vercelProduction;

/**
 * Indexacion. Un "true" o "false" explicito en NEXT_PUBLIC_INDEXING_ENABLED manda. Sin la variable: en Vercel se indexa solo el
 * despliegue de produccion (VERCEL_ENV=production) y las vistas previas quedan con noindex, para que Google no vea contenido
 * duplicado; fuera de Vercel (local, pruebas), noindex.
 */
const indexing = process.env.NEXT_PUBLIC_INDEXING_ENABLED || (process.env.VERCEL_ENV === "production" ? "true" : "false");

const parsed = schema.safeParse({
  NEXT_PUBLIC_SITE_URL: siteUrl,
  NEXT_PUBLIC_INDEXING_ENABLED: indexing,
});
if (!parsed.success) {
  throw new Error(`Variables de entorno publicas invalidas: ${z.prettifyError(parsed.error)}`);
}
if (process.env.NODE_ENV === "production" && !siteUrl) {
  throw new Error("NEXT_PUBLIC_SITE_URL es obligatoria en produccion (canonical, sitemap y OG dependen de ella). Fuera de Vercel no hay respaldo: definela.");
}

export const env = { ...parsed.data, indexable: parsed.data.NEXT_PUBLIC_INDEXING_ENABLED === "true" };
