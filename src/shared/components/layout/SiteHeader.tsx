import { routing, type Locale } from "@/i18n/routing";
import QuoteButton from "@/features/contact/components/QuoteButton";
import { getCopy } from "@/content/docs";
import { HTML_LANG } from "@/shared/constants/site";
import AppLink from "@/shared/components/core/AppLink";
import { buttonStyles } from "@/shared/components/core/Button";
import { cn } from "@/shared/lib/cn";
import { pathFor } from "@/shared/lib/seo";
import { localeEquivalents } from "./equivalents";
import LocaleSwitch from "./LocaleSwitch";
import Logo from "./Logo";
import MainNav from "./MainNav";
import MobileNav from "./MobileNav";
import ServicesPanel from "./ServicesPanel";
import SiteSearch from "./SiteSearch";
import ThemeToggle from "./ThemeToggle";
import { buildNav, servicesHref } from "./nav";

export default function SiteHeader({ locale }: { locale: Locale }) {
  const c = getCopy(locale);
  const items = buildNav(locale);
  const contactHref = pathFor(locale, { pathname: "/contact" });
  const sm = c.ui.servicesMenu;
  const servicesProps = { label: sm.label, href: servicesHref(locale), openTitle: sm.openTitle, closeTitle: sm.closeTitle, panelLabel: sm.panelLabel };
  const panel = <ServicesPanel locale={locale} />;
  // Atajos del buscador: las paginas principales y el contacto (se muestran antes de escribir y cuando no hay resultados).
  const shortcuts = [
    { label: c.nav.services.label, title: c.nav.services.title, href: servicesHref(locale) },
    ...items.map((i) => ({ label: i.label, title: i.title, href: i.href })),
    { label: c.nav.faq.label, title: c.nav.faq.title, href: pathFor(locale, { pathname: "/faq" }) },
    { label: c.nav.about.label, title: c.nav.about.title, href: pathFor(locale, { pathname: "/about" }) },
    { label: c.nav.contact.label, title: c.nav.contact.title, href: contactHref },
  ];
  const switcher = (
    <LocaleSwitch
      current={locale}
      label={c.ui.lang.label}
      items={routing.locales.map((l) => ({ locale: l, lang: HTML_LANG[l], home: `/${l}`, ...c.ui.lang[l] }))}
      equivalents={localeEquivalents()}
    />
  );

  return (
    <header className="sticky top-0 z-50 bg-paper shadow-raised">
      <div className="mx-auto flex h-16 w-full max-w-[75rem] items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <AppLink href={pathFor(locale, { pathname: "/" })} title={c.brand.logoTitle} className="flex items-center">
          <Logo title={c.brand.imageTitles.logo} className="h-6 w-auto sm:h-7" />
        </AppLink>
        <MainNav items={items} label={c.ui.navLabel} orientation="bar" services={servicesProps} panel={panel} />
        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <SiteSearch locale={locale} copy={c.ui.search} shortcuts={shortcuts} />
          <ThemeToggle toLight={c.ui.theme.toLight} toDark={c.ui.theme.toDark} />
          {switcher}
          <QuoteButton locale={locale} label={c.ui.cta.label} title={c.ui.cta.title} className="hidden whitespace-nowrap md:inline-flex" />
          <MobileNav
            openLabel={c.ui.menu.open}
            openTitle={c.ui.menu.openTitle}
            closeLabel={c.ui.menu.close}
            closeTitle={c.ui.menu.closeTitle}
            logo={
              <AppLink href={pathFor(locale, { pathname: "/" })} title={c.brand.logoTitle} className="flex items-center">
                <Logo title={c.brand.imageTitles.logo} className="h-6 w-auto" />
              </AppLink>
            }
          >
            <MainNav items={items} label={c.ui.navLabel} orientation="stack" services={servicesProps} panel={panel} />
            <div className="mt-auto border-t border-line px-4 pt-6">
              <AppLink href={contactHref} title={c.ui.cta.title} className={cn(buttonStyles(), "w-full")}>
                {c.ui.cta.label}
              </AppLink>
            </div>
          </MobileNav>
        </div>
      </div>
    </header>
  );
}
