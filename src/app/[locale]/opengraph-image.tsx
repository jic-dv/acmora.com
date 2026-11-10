import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getCopy } from "@/content/docs";
import { COMPANY } from "@/shared/constants/site";
import { OG_SIZE, ogImage } from "@/shared/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Acmora: páginas web y aplicaciones web a medida";

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const c = getCopy(locale);
  return ogImage({ path: `${COMPANY.name.toLowerCase()} /`, title: c.docs.home.title, footer: c.brand.tagline });
}
