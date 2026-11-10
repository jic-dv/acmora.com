import { z } from "@/shared/lib/z";

const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z
    .url()
    .refine((v) => !v.endsWith("/"), "Sin barra final")
    .default("http://localhost:3000"),
  // El sitio se publica con noindex hasta que se confirme explicitamente (contenido de ejemplo, previews).
  NEXT_PUBLIC_INDEXING_ENABLED: z.enum(["true", "false"]).default("false"),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_INDEXING_ENABLED: process.env.NEXT_PUBLIC_INDEXING_ENABLED,
});
if (!parsed.success) {
  throw new Error(`Variables de entorno publicas invalidas: ${z.prettifyError(parsed.error)}`);
}
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL) {
  throw new Error("NEXT_PUBLIC_SITE_URL es obligatoria en produccion (canonical, sitemap y OG dependen de ella).");
}

export const env = { ...parsed.data, indexable: parsed.data.NEXT_PUBLIC_INDEXING_ENABLED === "true" };
