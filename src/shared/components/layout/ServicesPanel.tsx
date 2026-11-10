import { ArrowRight } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { getCopy } from "@/content/docs";
import { getServices } from "@/features/catalog/services/catalog";
import AppLink from "@/shared/components/core/AppLink";
import { buttonStyles } from "@/shared/components/core/Button";
import Icon from "@/shared/components/core/Icon";
import { pathFor } from "@/shared/lib/seo";
import CurrentLink from "./CurrentLink";
import { servicesHref } from "./nav";

/**
 * Contenido del desplegable de servicios (estilo Google): solo la lista de servicios, sin titulos de grupo, cada uno con
 * icono, nombre y descripcion. Una columna en espacios angostos (cajon movil) y dos en el desplegable ancho: el ancho lo
 * decide el propio contenedor (consulta de contenedor), no la pantalla. Es un componente de servidor.
 */
export default function ServicesPanel({ locale }: { locale: Locale }) {
  const c = getCopy(locale);
  const base = servicesHref(locale);

  return (
    <div className="@container">
      <ul className="grid max-w-none list-none gap-1 pl-0 @2xl:grid-cols-2 @2xl:gap-x-10">
        {getServices().map((s) => (
          <li key={s.slug} className="mt-0 max-w-none">
            <CurrentLink
              href={pathFor(locale, { pathname: "/services/[slug]", slug: s.slug })}
              title={s.summary[locale]}
              className="group flex gap-3 rounded-card p-3 text-ink no-underline transition-colors duration-(--duration-enter) hover:bg-surface aria-[current=page]:bg-blue-soft"
            >
              <Icon name={s.icon} size={20} className="mt-0.5 shrink-0 text-ink-soft" />
              <span>
                <span className="block font-medium transition-colors duration-(--duration-enter) group-hover:text-blue group-aria-[current=page]:text-blue">{s.name[locale]}</span>
                <span className="mt-0.5 line-clamp-2 block text-sm text-ink-soft">{s.summary[locale]}</span>
              </span>
            </CurrentLink>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex border-t border-line pt-4">
        <AppLink href={base} title={c.ui.servicesMenu.viewAll.title} className={buttonStyles({ variant: "outline" })}>
          {c.ui.servicesMenu.viewAll.label}
          <ArrowRight aria-hidden="true" size={18} />
        </AppLink>
      </div>
    </div>
  );
}
