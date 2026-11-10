"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import Button from "@/shared/components/core/Button";
import { cn } from "@/shared/lib/cn";
import type { DetailSection, PlanDetail } from "@/shared/lib/doc";

const panel = "rounded-[20px] border border-line-strong";
const title = "mt-0 text-base font-medium";
// Dentro de un .doc, cada fila de <dl> hereda borde y relleno de la prosa: se anulan para controlar los espacios aqui.
const noRules = "[&>div]:border-b-0 [&>div]:p-0 [&>div:first-child]:border-t-0";

/** Contenido de una seccion: texto, filas rotulo-valor y lista (con palomitas o vinetas). */
function Body({ sec }: { sec: DetailSection }) {
  return (
    <>
      {sec.text ? <p className="text-sm leading-relaxed text-ink-soft">{sec.text}</p> : null}
      {sec.rows ? (
        <dl className={cn("m-0 grid gap-1.5 text-sm", noRules)}>
          {sec.rows.map(([term, desc], i) => {
            const last = sec.emphasis === true && i === (sec.rows?.length ?? 0) - 1;
            return (
              <div key={term} className={cn("m-0 flex items-baseline justify-between gap-4", last && "border-t border-line !pt-2 text-base font-medium")}>
                <dt className={cn("m-0", !last && "text-ink-soft")}>{term}</dt>
                <dd className={cn("m-0 text-right", last ? "text-xl" : "font-medium")}>{desc}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}
      {sec.items ? (
        sec.marker === "check" ? (
          <ul className="m-0 grid list-none gap-2 p-0 text-sm">
            {sec.items.map((item) => (
              <li key={item} className="m-0 flex gap-2">
                <Check aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-add" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="m-0 grid list-disc gap-2 pl-5 text-sm text-ink-soft">
            {sec.items.map((item) => (
              <li key={item} className="m-0">
                {item}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </>
  );
}

/**
 * Enlace centrado "Ver mas" al pie de cada plan: abre un dialogo modal estilo Google (Material, 28 px) con el mismo formato
 * que el cotizador: paneles con borde, el resto de las secciones colapsables y mucho aire. El contenido llega ya redactado
 * y con los precios calculados desde el servidor. Se monta al abrir por primera vez; <dialog> nativo resuelve foco, Escape y velo.
 */
export default function PlanDetails({ detail }: { detail: PlanDetail }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [opened, setOpened] = useState(false);

  const open = () => {
    setOpened(true);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  return (
    <div className="mt-3 flex justify-center">
      <button
        type="button"
        title={detail.title}
        onClick={open}
        className="plain inline-flex min-h-11 items-center rounded-pill px-4 font-medium text-blue transition-colors duration-(--duration-enter) hover:bg-blue-soft hover:text-blue-hover"
      >
        {detail.label}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
        className="g-dialog m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[40rem] flex-col overflow-hidden rounded-[28px] bg-paper p-0 text-left text-ink shadow-raised open:flex"
      >
        {opened ? (
          <div className="flex min-h-0 flex-1 flex-col [&_p]:mt-0">
            <header className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6">
              <div className="grid gap-0.5">
                <h2 id={titleId} className="text-xl font-medium leading-snug sm:text-2xl">
                  {detail.heading}
                </h2>
                <p className="text-sm text-ink-soft">{detail.subtitle}</p>
              </div>
              <button
                type="button"
                title={detail.close.title}
                aria-label={detail.close.title}
                onClick={close}
                className="-mr-2 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors duration-(--duration-enter) hover:bg-surface hover:text-ink"
              >
                <X aria-hidden="true" size={22} />
              </button>
            </header>

            <div className="quote-scroll grid min-h-0 flex-1 content-start gap-3 overflow-y-auto overscroll-contain px-5 pb-5 pt-1 sm:px-6" tabIndex={0}>
              {detail.sections.map((sec, i) =>
                sec.collapsed ? (
                  <details key={`${sec.heading}-${i}`} className={cn(panel, "group")}>
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[20px] px-4 sm:px-5 [&::-webkit-details-marker]:hidden">
                      <span className={title}>{sec.heading}</span>
                      <ChevronDown aria-hidden="true" size={20} className="shrink-0 text-ink-soft transition-transform duration-(--duration-enter) group-open:rotate-180" />
                    </summary>
                    <div className="grid gap-3 px-4 pb-4 sm:px-5">
                      <Body sec={sec} />
                    </div>
                  </details>
                ) : (
                  <section key={`${sec.heading}-${i}`} aria-labelledby={`${titleId}-${i}`} className={cn(panel, "grid gap-3 px-4 py-4 sm:px-5", sec.emphasis && "bg-surface")}>
                    <h3 id={`${titleId}-${i}`} className={title}>
                      {sec.heading}
                    </h3>
                    <Body sec={sec} />
                  </section>
                ),
              )}
            </div>

            <footer className="flex shrink-0 justify-end border-t border-line px-4 py-3 sm:px-6">
              <Button type="button" title={detail.close.title} onClick={close} className="min-h-10 px-5 text-sm">
                {detail.close.label}
              </Button>
            </footer>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
