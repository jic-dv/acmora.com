import type { ReactNode } from "react";
import type { Locale } from "@/i18n/routing";
import { getCopy } from "@/content/docs";
import JsonLd from "@/shared/components/core/JsonLd";
import DocView from "@/shared/components/doc/DocView";
import type { Doc } from "@/shared/lib/doc";
import DocToc, { type TocDoc, type TocItem } from "@/shared/components/doc/DocToc";
import Hero, { type Crumb } from "./Hero";
import HeroAside from "./HeroAside";

type Props = {
  locale: Locale;
  doc: Doc;
  crumbs: Crumb[];
  schema: Record<string, unknown>;
  slots?: Record<string, ReactNode>;
  /** Pieza fija sobre el contenido (buscador de preguntas frecuentes). */
  before?: ReactNode;
  /** Botones de accion del hero (portada). */
  heroActions?: ReactNode;
  /** Navegacion lateral entre las secciones (documentos legales): enlaces a las secciones y a los documentos hermanos. */
  toc?: { label: string; items: TocItem[]; docsLabel: string; docs: TocDoc[] };
  /** Portada: titular grande y botones de la llamada a la accion dentro del hero. */
  home?: boolean;
};

export default function PageFrame({ locale, doc, crumbs, schema, slots, before, heroActions, home, toc }: Props) {
  const ui = getCopy(locale).ui;

  return (
    <>
      <JsonLd data={schema} />
      <Hero
        locale={locale}
        title={doc.title}
        lead={doc.lead}
        crumbs={crumbs}
        breadcrumbLabel={ui.breadcrumbLabel}
        actions={heroActions}
        large={home}
        aside={home ? <HeroAside copy={ui.devices} /> : undefined}
      />

      <div className="bg-paper pb-20 pt-6 sm:pt-8">
        <div className="relative z-10 mx-auto grid w-full max-w-[75rem] grid-cols-[minmax(0,1fr)] gap-2 px-4 sm:px-6">
          {before}
          {toc ? (
            <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
              <DocToc {...toc} />
              <div className="min-w-0">
                <DocView doc={doc} locale={locale} slots={slots} />
              </div>
            </div>
          ) : (
            <DocView doc={doc} locale={locale} slots={slots} />
          )}
        </div>
      </div>
    </>
  );
}
