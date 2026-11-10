import { routing } from "@/i18n/routing";
import { getServices } from "@/features/catalog/services/catalog";
import { PAGE_PATHNAME, type PageKey } from "@/shared/lib/doc";
import { pathFor, type PageRef } from "@/shared/lib/seo";

/** Ruta localizada -> ruta equivalente en cada otro idioma. Alimenta el selector de idioma sin next-intl en cliente. */
export function localeEquivalents(): Record<string, Record<string, string>> {
  const refs: PageRef[] = [
    ...(Object.keys(PAGE_PATHNAME) as PageKey[]).map((k) => ({ pathname: PAGE_PATHNAME[k] }) as PageRef),
    ...getServices().map((s): PageRef => ({ pathname: "/services/[slug]", slug: s.slug })),
  ];
  const map: Record<string, Record<string, string>> = {};
  for (const ref of refs) {
    for (const from of routing.locales) {
      map[pathFor(from, ref)] = Object.fromEntries(routing.locales.filter((l) => l !== from).map((to) => [to, pathFor(to, ref)]));
    }
  }
  return map;
}
