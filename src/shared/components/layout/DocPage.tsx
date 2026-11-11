import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/routing";
import { getCopy, getPageDoc } from "@/content/docs";
import { getPlanServices } from "@/features/catalog/services/catalog";
import { getProjects } from "@/features/projects/services/projects";
import { COMPANY, SITE_REVISION, whatsappLink } from "@/shared/constants/site";
import { PAGE_PATHNAME, type PageKey } from "@/shared/lib/doc";
import { keywordsFor, SERVICE_KEYWORDS } from "@/shared/constants/keywords";
import { breadcrumbNode, faqPageNode, graph, organizationNode, websiteNode, webPageNode } from "@/shared/lib/jsonld";
import { getFxRates } from "@/shared/lib/fx";
import { FALLBACK_FX, planAmount, type FxRates } from "@/shared/lib/money";
import { absoluteUrl, buildMetadata, pathFor } from "@/shared/lib/seo";
import { cn } from "@/shared/lib/cn";
import AppLink from "@/shared/components/core/AppLink";
import { buttonStyles } from "@/shared/components/core/Button";
import FaqSearch from "@/shared/components/doc/FaqSearch";
import PageFrame from "./PageFrame";

type StaticRef = Parameters<typeof pathFor>[1];
const refFor = (key: PageKey): StaticRef => ({ pathname: PAGE_PATHNAME[key] as Exclude<(typeof PAGE_PATHNAME)[PageKey], "/services/[slug]"> });

/** Documentos legales: llevan navegacion lateral entre sus secciones. */
const LEGAL_KEYS: PageKey[] = ["privacy", "terms", "cookies"];

/** Grupos de palabras clave de cada pagina (ademas de la marca y las generales). */
const PAGE_KEYWORDS: Record<PageKey, Parameters<typeof keywordsFor>[1][]> = {
  home: ["landing", "multipagina", "crm"],
  services: ["landing", "multipagina", "crm", "maintenance"],
  pricing: ["pricing"],
  projects: ["multipagina"],
  faq: ["faq"],
  about: ["about"],
  contact: ["contact"],
  privacy: [],
  terms: [],
  cookies: [],
};

const PAGE_TYPE = { about: "AboutPage", contact: "ContactPage", services: "CollectionPage", pricing: "CollectionPage", projects: "CollectionPage" } as const;

export function docMetadata(locale: Locale, key: PageKey): Metadata {
  const m = getCopy(locale).meta[key];
  return buildMetadata({ locale, ref: refFor(key), title: m.title, description: m.description, keywords: keywordsFor(locale, ...PAGE_KEYWORDS[key]) });
}

function extraNodes(locale: Locale, key: PageKey, fx: FxRates): Record<string, unknown>[] {
  const c = getCopy(locale);
  const orgId = `${absoluteUrl("/")}#organization`;
  const list = (name: string, items: Record<string, unknown>[]) => ({
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, item })),
  });
  const offersOf = (plans: { name: Record<Locale, string>; priceClp: number; from: boolean }[]) =>
    plans.map((p) => {
      const { amount, currency } = planAmount(p.priceClp, locale, fx);
      return {
        "@type": "Offer",
        name: p.name[locale],
        priceCurrency: currency,
        // Precio cerrado: "price"; precio de partida (CRM): "minPrice".
        priceSpecification: { "@type": "PriceSpecification", ...(p.from ? { minPrice: amount } : { price: amount }), priceCurrency: currency, valueAddedTaxIncluded: true },
      };
    });

  switch (key) {
    case "home":
      return [organizationNode(locale), websiteNode(locale)];
    case "services":
    case "pricing":
      return [
        list(
          c.nav[key].label,
          getPlanServices().map((s) => ({
            "@type": "Service",
            name: s.name[locale],
            description: s.summary[locale],
            url: absoluteUrl(pathFor(locale, { pathname: "/services/[slug]", slug: s.slug })),
            provider: { "@id": orgId },
            serviceType: s.name[locale],
            category: locale === "es" ? "Desarrollo de software" : "Software development",
            keywords: keywordsFor(locale, SERVICE_KEYWORDS[s.slug] ?? "general").join(", "),
            offers: offersOf(s.plans),
          })),
        ),
      ];
    case "projects":
      return [
        list(
          c.nav.projects.label,
          getProjects().map((p) => ({
            "@type": "CreativeWork",
            name: p.title[locale],
            description: p.description[locale],
            url: p.url,
            datePublished: p.publishedAt,
            image: absoluteUrl(p.cover),
            creator: { "@id": orgId },
          })),
        ),
      ];
    case "contact":
      return [
        organizationNode(locale),
        { "@type": "ContactPoint", contactType: "sales", email: COMPANY.email, telephone: COMPANY.phone, availableLanguage: ["es", "en"] },
      ];
    case "faq":
      return [faqPageNode(c.faq.items)];
    default:
      return [];
  }
}

export default async function DocPage({ locale, pageKey, slots }: { locale: Locale; pageKey: PageKey; slots?: Record<string, ReactNode> }) {
  const c = getCopy(locale);
  // El tipo de cambio solo se consulta en las paginas con precios (se cachea una hora).
  const fx = pageKey === "home" || pageKey === "pricing" || pageKey === "services" ? await getFxRates() : FALLBACK_FX;
  const doc = getPageDoc(locale, pageKey, fx);
  const path = pathFor(locale, refFor(pageKey));
  const isHome = pageKey === "home";

  const crumbNodes = [{ name: COMPANY.name, path: pathFor(locale, refFor("home")) }, ...(isHome ? [] : [{ name: c.nav[pageKey].label, path }])];
  const type = PAGE_TYPE[pageKey as keyof typeof PAGE_TYPE] ?? "WebPage";

  const schema = graph(
    webPageNode({ locale, type, name: c.meta[pageKey].title, description: c.meta[pageKey].description, path, dateModified: SITE_REVISION.date }),
    breadcrumbNode(crumbNodes),
    ...extraNodes(locale, pageKey, fx),
  );

  return (
    <PageFrame
      locale={locale}
      doc={doc}
      crumbs={isHome ? [] : [{ label: c.nav.home.label, title: c.nav.home.title, href: "/" }, { label: c.nav[pageKey].label }]}
      schema={schema}
      toc={
        LEGAL_KEYS.includes(pageKey)
          ? {
              label: c.ui.toc.label,
              items: doc.sections.map((s) => ({ id: s.id, label: s.heading, title: c.ui.toc.goto(s.heading) })),
              docsLabel: c.ui.toc.docs,
              docs: LEGAL_KEYS.map((k) => ({ label: c.nav[k].label, title: c.nav[k].title, href: pathFor(locale, refFor(k)), current: k === pageKey })),
            }
          : undefined
      }
      home={isHome}
      before={pageKey === "faq" ? <FaqSearch copy={c.ui.faqSearch} /> : undefined}
      heroActions={
        isHome ? (
          <>
            <AppLink href={pathFor(locale, { pathname: "/services" })} title={c.docs.home.hero.primary.title} className={cn(buttonStyles({ variant: "light", size: "lg" }), "w-full sm:w-auto")}>
              {c.docs.home.hero.primary.label}
            </AppLink>
            <AppLink
              href={whatsappLink(c.docs.home.hero.secondary.message)}
              title={c.docs.home.hero.secondary.title}
              className={cn(buttonStyles({ variant: "outline-dark", size: "lg" }), "w-full sm:w-auto")}
            >
              {c.docs.home.hero.secondary.label}
            </AppLink>
          </>
        ) : pageKey === "pricing" ? (
          <>
            <a href="#h-precios-por-servicio" title={c.docs.pricing.hero.primary.title} className={cn(buttonStyles({ variant: "light", size: "lg" }), "w-full sm:w-auto")}>
              {c.docs.pricing.hero.primary.label}
            </a>
            <AppLink href={pathFor(locale, { pathname: "/contact" })} title={c.docs.pricing.hero.secondary.title} className={cn(buttonStyles({ variant: "outline-dark", size: "lg" }), "w-full sm:w-auto")}>
              {c.docs.pricing.hero.secondary.label}
            </AppLink>
          </>
        ) : undefined
      }
      slots={slots}
    />
  );
}
