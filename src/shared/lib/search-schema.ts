import type { SearchEntry } from "@/shared/lib/search";
import { z } from "@/shared/lib/z";

/** Esquema del indice del buscador (borde: respuesta de /api/search/{idioma}). */
export const entrySchema = z.object({ t: z.string(), p: z.string(), h: z.string(), x: z.string(), k: z.enum(["page", "section", "faq"]) }) satisfies z.ZodType<SearchEntry>;
export const indexSchema = z.array(entrySchema);
