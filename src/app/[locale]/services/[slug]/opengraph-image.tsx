import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getCopy } from "@/content/docs";
import { getService } from "@/features/catalog/services/catalog";
import { COMPANY } from "@/shared/constants/site";
import { OG_SIZE, ogImage } from "@/shared/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Servicio de Acmora";

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const service = getService(slug);
  if (!hasLocale(routing.locales, locale) || !service) notFound();
  const c = getCopy(locale);
  return ogImage({
    path: `${COMPANY.name.toLowerCase()} / ${c.nav.services.label.toLowerCase()} / ${slug}`,
    title: service.name[locale],
    footer: service.tagline[locale],
  });
}
