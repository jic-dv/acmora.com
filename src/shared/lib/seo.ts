import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type AppPathname, type Locale } from "@/i18n/routing";
import { COMPANY, HTML_LANG, OG_LOCALE } from "@/shared/constants/site";
import { env } from "./env";

type StaticPathname = Exclude<AppPathname, "/services/[slug]">;
export type PageRef = { pathname: StaticPathname } | { pathname: "/services/[slug]"; slug: string };

export const absoluteUrl = (path: string) => `${env.NEXT_PUBLIC_SITE_URL}${path === "/" ? "" : path}`;

export function pathFor(locale: Locale, ref: PageRef): string {
  if (ref.pathname === "/services/[slug]") {
    return getPathname({ locale, href: { pathname: "/services/[slug]", params: { slug: ref.slug } } });
  }
  return getPathname({ locale, href: ref.pathname });
}

export function alternatesFor(ref: PageRef) {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[HTML_LANG[l]] = absoluteUrl(pathFor(l, ref));
  languages["x-default"] = absoluteUrl(pathFor(routing.defaultLocale, ref));
  return languages;
}

type Input = {
  locale: Locale;
  ref: PageRef;
  title: string;
  description: string;
  type?: "website" | "article";
  /** Fuerza noindex en la ruta (por ejemplo, filtros combinatorios). */
  noindex?: boolean;
};

export function buildMetadata({ locale, ref, title, description, type = "website", noindex }: Input): Metadata {
  const url = absoluteUrl(pathFor(locale, ref));
  const other = routing.locales.filter((l) => l !== locale);
  const index = env.indexable && !noindex;
  return {
    title: { absolute: title },
    description,
    applicationName: COMPANY.name,
    authors: [{ name: COMPANY.name }],
    publisher: COMPANY.name,
    alternates: { canonical: url, languages: alternatesFor(ref) },
    robots: index ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type,
      title,
      description,
      url,
      siteName: COMPANY.name,
      locale: OG_LOCALE[locale],
      alternateLocale: other.map((l) => OG_LOCALE[l]),
    },
    twitter: { card: "summary_large_image", title, description },
    other: { "content-language": HTML_LANG[locale] },
  };
}
