import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getCopy, serviceDoc } from "@/content/docs";
import { getService } from "@/features/catalog/services/catalog";
import PageFrame from "@/shared/components/layout/PageFrame";
import { COMPANY, HTML_LANG } from "@/shared/constants/site";
import { getFxRates } from "@/shared/lib/fx";
import { breadcrumbNode, graph, webPageNode } from "@/shared/lib/jsonld";
import { planAmount } from "@/shared/lib/money";
import { absoluteUrl, buildMetadata, pathFor } from "@/shared/lib/seo";
import { SITE_REVISION } from "@/shared/constants/site";
import { keywordsFor, SERVICE_KEYWORDS } from "@/shared/constants/keywords";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const service = getService(slug);
  if (!hasLocale(routing.locales, locale) || !service) notFound();
  return buildMetadata({
    locale,
    ref: { pathname: "/services/[slug]", slug },
    title: service.meta.title[locale],
    description: service.meta.description[locale],
    keywords: keywordsFor(locale, SERVICE_KEYWORDS[slug] ?? "general"),
  });
}

export default async function ServicePage({ params }: Props) {
  const { locale, slug } = await params;
  const service = getService(slug);
  if (!hasLocale(routing.locales, locale) || !service) notFound();

  const c = getCopy(locale);
  const fx = await getFxRates();
  const doc = serviceDoc(locale, service, fx);
  const path = pathFor(locale, { pathname: "/services/[slug]", slug });
  const orgId = `${absoluteUrl("/")}#organization`;

  const offers =
    service.kind === "plans"
      ? service.plans.map((p) => {
          const { amount, currency } = planAmount(p.priceClp, locale, fx);
          return {
            "@type": "Offer",
            name: p.name[locale],
            priceCurrency: currency,
            // Precio cerrado: "price"; precio de partida (CRM): "minPrice".
            priceSpecification: { "@type": "PriceSpecification", ...(p.from ? { minPrice: amount } : { price: amount }), priceCurrency: currency, valueAddedTaxIncluded: true },
          };
        })
      : [];

  const schema = graph(
    webPageNode({ locale, type: "WebPage", name: service.meta.title[locale], description: service.meta.description[locale], path, dateModified: SITE_REVISION.date }),
    {
      "@type": "Service",
      "@id": `${absoluteUrl(path)}#service`,
      name: service.name[locale],
      description: service.summary[locale],
      inLanguage: HTML_LANG[locale],
      provider: { "@id": orgId },
      serviceType: service.name[locale],
      category: locale === "es" ? "Desarrollo de software" : "Software development",
      keywords: keywordsFor(locale, SERVICE_KEYWORDS[slug] ?? "general").join(", "),
      ...(offers.length ? { offers } : {}),
    },
    breadcrumbNode([
      { name: COMPANY.name, path: pathFor(locale, { pathname: "/" }) },
      { name: c.nav.services.label, path: pathFor(locale, { pathname: "/services" }) },
      { name: service.name[locale], path },
    ]),
  );

  return (
    <PageFrame
      locale={locale}
      doc={doc}
      schema={schema}
      crumbs={[
        { label: c.nav.home.label, title: c.nav.home.title, href: "/" },
        { label: c.nav.services.label, title: c.nav.services.title, href: "/services" },
        { label: service.name[locale] },
      ]}
    />
  );
}
