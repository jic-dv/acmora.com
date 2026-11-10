import type { Locale } from "@/i18n/routing";
import { COMPANY, HTML_LANG } from "@/shared/constants/site";
import { absoluteUrl } from "./seo";

const orgId = () => `${absoluteUrl("/")}#organization`;
const siteId = () => `${absoluteUrl("/")}#website`;

export function organizationNode(locale: Locale) {
  return {
    "@type": "ProfessionalService",
    "@id": orgId(),
    name: COMPANY.name,
    legalName: COMPANY.legalName,
    url: absoluteUrl(`/${locale}`),
    logo: { "@type": "ImageObject", url: absoluteUrl(COMPANY.logo.square), width: 500, height: 500 },
    image: absoluteUrl(COMPANY.logo.square),
    email: COMPANY.email,
    telephone: COMPANY.phone,
    areaServed: { "@type": "Country", name: "Chile" },
    address: {
      "@type": "PostalAddress",
      addressLocality: COMPANY.address.locality,
      addressRegion: COMPANY.address.region,
      addressCountry: COMPANY.address.country,
    },
    knowsLanguage: ["es-CL", "en"],
  };
}

export function websiteNode(locale: Locale) {
  return {
    "@type": "WebSite",
    "@id": siteId(),
    name: COMPANY.name,
    url: absoluteUrl(`/${locale}`),
    inLanguage: HTML_LANG[locale],
    publisher: { "@id": orgId() },
  };
}

export function breadcrumbNode(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

type WebPageType = "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";

export function webPageNode(input: { locale: Locale; type: WebPageType; name: string; description: string; path: string; dateModified: string }) {
  return {
    "@type": input.type,
    "@id": `${absoluteUrl(input.path)}#webpage`,
    url: absoluteUrl(input.path),
    name: input.name,
    description: input.description,
    inLanguage: HTML_LANG[input.locale],
    dateModified: input.dateModified,
    isPartOf: { "@id": siteId() },
    publisher: { "@id": orgId() },
  };
}

export function graph(...nodes: Record<string, unknown>[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
