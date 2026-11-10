import type { Locale } from "@/i18n/routing";
import AuthorCredit from "./AuthorCredit";
import { getCopy } from "@/content/docs";
import { COMPANY, SITE_REVISION, whatsappLink } from "@/shared/constants/site";
import AppLink from "@/shared/components/core/AppLink";
import { pathFor, type PageRef } from "@/shared/lib/seo";
import Logo from "./Logo";

const GROUPS = [
  { key: "company", links: [["services", "/services"], ["projects", "/projects"], ["pricing", "/pricing"], ["faq", "/faq"], ["about", "/about"], ["contact", "/contact"]] },
  { key: "legal", links: [["privacy", "/privacy"], ["terms", "/terms"], ["cookies", "/cookies"]] },
] as const;

const linkClass = "text-night-soft no-underline hover:text-white hover:underline underline-offset-4";

export default function SiteFooter({ locale }: { locale: Locale }) {
  const c = getCopy(locale);
  const year = SITE_REVISION.date.slice(0, 4);
  const emailTitle = locale === "es" ? "Escribir un correo a Acmora" : "Send an email to Acmora";
  const whatsappTitle = locale === "es" ? "Escribir por WhatsApp a Acmora" : "Message Acmora on WhatsApp";

  return (
    <footer className="on-dark bg-night text-night-soft">
      <div className="mx-auto grid w-full max-w-[75rem] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1.3fr]">
        <div>
          <Logo mode="on-dark" height={32} title={c.brand.imageTitles.logo} />
          <p className="mt-4 max-w-[32ch]">{c.brand.tagline}</p>
        </div>

        {GROUPS.map((g) => (
          <nav key={g.key} aria-label={c.ui.footer[g.key]}>
            <p className="font-medium text-white">{c.ui.footer[g.key]}</p>
            <ul className="mt-4 grid gap-3">
              {g.links.map(([key, href]) => (
                <li key={key}>
                  <AppLink href={pathFor(locale, { pathname: href } as PageRef)} title={c.nav[key].title} className={linkClass}>
                    {c.nav[key].label}
                  </AppLink>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <address className="not-italic">
          <p className="font-medium text-white">{c.nav.contact.label}</p>
          <ul className="mt-4 grid gap-3">
            <li>
              <AppLink href={`mailto:${COMPANY.email}`} title={emailTitle} className={linkClass}>
                {COMPANY.email}
              </AppLink>
            </li>
            <li>
              <AppLink href={whatsappLink(c.ui.whatsapp.footer)} title={whatsappTitle} className={linkClass}>
                WhatsApp {COMPANY.phone}
              </AppLink>
            </li>
            <li>{COMPANY.hours[locale]}</li>
          </ul>
        </address>
      </div>

      <div className="border-t border-night-line">
        {/* Barra final: derechos a la izquierda y origen a la derecha. En movil deja espacio abajo para los botones flotantes. */}
        <div className="mx-auto flex w-full max-w-[75rem] flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 pb-20 pt-5 text-sm sm:px-6 sm:pb-5 sm:pr-20">
          <p>
            © {year} {COMPANY.name}. {c.ui.rights}
          </p>
          <AuthorCredit copy={c.ui.credits} />
        </div>
      </div>
    </footer>
  );
}
