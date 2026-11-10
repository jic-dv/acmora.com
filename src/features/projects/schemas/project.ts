import { z } from "@/shared/lib/z";
import { localized } from "@/shared/lib/localized";

const text = localized(z.string().min(1));

/** Fuente de verdad de un proyecto del portafolio: la usan el mock, el servicio y las pruebas. */
export const projectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  /** production: sitio publicado y en uso. demo: version de demostracion para revision. */
  status: z.enum(["production", "demo"]),
  title: text,
  description: text,
  /** Direccion publica (https) del proyecto. */
  url: z.url().startsWith("https://"),
  /** Fecha de publicacion, ISO sin hora (AAAA-MM-DD). */
  publishedAt: z.iso.date(),
  /** Portada: ruta bajo /public, 16:9. */
  cover: z.string().startsWith("/images/projects/"),
  coverAlt: text,
  /** Etiquetas cortas: tipo de sitio, tecnologia o funcion. */
  tags: z.array(text).min(1).max(4),
});

export type Project = z.infer<typeof projectSchema>;
