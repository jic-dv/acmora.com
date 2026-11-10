import type { MetadataRoute } from "next";
import { getServices } from "@/features/catalog/services/catalog";
import { routing } from "@/i18n/routing";
import { PAGE_PATHNAME, type PageKey } from "@/shared/lib/doc";
import { SITE_REVISION } from "@/shared/constants/site";
import { env } from "@/shared/lib/env";
import { absoluteUrl, alternatesFor, pathFor, type PageRef } from "@/shared/lib/seo";

type Entry = { ref: PageRef; lastModified: string };

export default function sitemap(): MetadataRoute.Sitemap {
  if (!env.indexable) return [];

  const pages: Entry[] = (Object.keys(PAGE_PATHNAME) as PageKey[]).map((key) => ({
    ref: { pathname: PAGE_PATHNAME[key] as Exclude<(typeof PAGE_PATHNAME)[PageKey], "/services/[slug]"> },
    lastModified: SITE_REVISION.date,
  }));
  const services: Entry[] = getServices().map((s) => ({ ref: { pathname: "/services/[slug]", slug: s.slug }, lastModified: SITE_REVISION.date }));

  // Una entrada por URL e idioma, cada una con sus alternates (hreflang), como pide Google.
  return [...pages, ...services].flatMap(({ ref, lastModified }) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(pathFor(locale, ref)),
      lastModified,
      alternates: { languages: alternatesFor(ref) },
    })),
  );
}
