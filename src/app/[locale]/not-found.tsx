import { getLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getCopy } from "@/content/docs";
import AppLink from "@/shared/components/core/AppLink";
import { buttonStyles } from "@/shared/components/core/Button";
import Hero from "@/shared/components/layout/Hero";
import { pathFor } from "@/shared/lib/seo";

export default async function NotFound() {
  const locale = (await getLocale()) as Locale;
  const c = getCopy(locale);
  const n = c.ui.notFound;
  return (
    <div className="pb-20">
      <Hero
        locale={locale}
        title={n.title}
        lead={n.lead}
        crumbs={[{ label: "404" }]}
        breadcrumbLabel={c.ui.breadcrumbLabel}
        actions={
          <AppLink href={pathFor(locale, { pathname: "/" })} title={n.homeTitle} className={buttonStyles({ variant: "light", size: "lg" })}>
            {n.homeLabel}
          </AppLink>
        }
      />
    </div>
  );
}
