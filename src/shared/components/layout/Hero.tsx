import type { ReactNode } from "react";
import type { Locale } from "@/i18n/routing";
import AppLink from "@/shared/components/core/AppLink";
import Inline from "@/shared/components/doc/Inline";
import { cn } from "@/shared/lib/cn";
import { pathFor } from "@/shared/lib/seo";
import HeroPattern from "./HeroPattern";

export type Crumb = { label: string; title?: string; href?: "/" | "/services" };

type Props = {
  locale: Locale;
  title: string;
  lead: string;
  /** Ruta de navegacion. Vacia en la portada: no se muestra. */
  crumbs: Crumb[];
  breadcrumbLabel: string;
  /** Botones de accion bajo la bajada (portada). */
  actions?: ReactNode;
  /** Hero de portada: titular mas grande y mas aire. */
  large?: boolean;
  /** Pieza visual a la derecha en pantallas anchas (decorativa). */
  aside?: ReactNode;
};

/** Hero sobre el azul de marca con un patron de red neuronal y simbolos de codigo (software e IA). */
export default function Hero({ locale, title, lead, crumbs, breadcrumbLabel, actions, large, aside }: Props) {
  return (
    <section className="hero-brand on-dark text-white" aria-labelledby="page-title">
      <HeroPattern />
      <div className={cn("mx-auto w-full max-w-[75rem] px-4 sm:px-6", large ? "pb-16 pt-14 sm:pb-20 sm:pt-20" : "pb-12 pt-10 sm:pb-16 sm:pt-14")}>
        <div className={cn(aside && "lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10")}>
          <div>
            {crumbs.length > 0 ? (
              <nav aria-label={breadcrumbLabel}>
                <ol className="flex flex-wrap items-center gap-x-2 text-[0.9375rem] text-white/85">
                  {crumbs.map((c, i) => (
                    <li key={`${c.label}-${i}`} className="flex items-center gap-2">
                      {i > 0 ? <span aria-hidden="true">/</span> : null}
                      {c.href ? (
                        <AppLink href={pathFor(locale, { pathname: c.href })} title={c.title ?? c.label} className="text-white/85 underline underline-offset-4 hover:text-white">
                          {c.label}
                        </AppLink>
                      ) : (
                        <span aria-current="page" className="text-white">
                          {c.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}

            <h1
              id="page-title"
              className={cn(
                large ? "text-[clamp(2.25rem,1rem+3.3vw,3.5rem)]" : "text-[clamp(2.125rem,1.4rem+3vw,3.5rem)]",
                // El interlineado va despues del tamano: tailwind-merge descarta leading-* si lo precede un text-[size].
                crumbs.length > 0 ? "mt-6" : "mt-0",
                "max-w-[22ch] font-medium leading-[1.12] tracking-[-0.015em] text-balance",
              )}
            >
              {title}
            </h1>
            <p className="mt-6 max-w-[58ch] text-[clamp(1.0625rem,1rem+0.4vw,1.3125rem)] leading-relaxed text-white/90 text-pretty">
              <Inline text={lead} locale={locale} />
            </p>

            {/* En pantallas pequenas cada boton ocupa todo el ancho, uno por fila. */}
            {actions ? <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div> : null}
          </div>
          {aside ? <div className="hidden lg:block">{aside}</div> : null}
        </div>
      </div>
    </section>
  );
}
