import type { Locale } from "@/i18n/routing";
import { getCopy } from "@/content/docs";
import { pathFor, type PageRef } from "@/shared/lib/seo";

export type NavItem = { id: string; label: string; title: string; href: string };

const MAIN: [keyof ReturnType<typeof getCopy>["nav"], PageRef][] = [
  ["pricing", { pathname: "/pricing" }],
  ["projects", { pathname: "/projects" }],
];

/** Navegacion principal sin "Servicios" (ese item abre el desplegable). Rutas resueltas en servidor. */
export function buildNav(locale: Locale): NavItem[] {
  const c = getCopy(locale);
  return MAIN.map(([key, ref]) => ({ id: key, label: c.nav[key].label, title: c.nav[key].title, href: pathFor(locale, ref) }));
}

export const servicesHref = (locale: Locale) => pathFor(locale, { pathname: "/services" });
