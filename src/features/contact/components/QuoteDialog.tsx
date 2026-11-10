"use client";

import type { Locale } from "@/i18n/routing";
import dynamic from "next/dynamic";
import type { QuoteOffer } from "@/shared/lib/doc";
import { useId, useRef, useState } from "react";
import type { QuoteShareLabels } from "../quote-message";
import type { QuoteField } from "../state";
import type { FieldsCopy } from "./QuoteFields";

// El formulario (dos pasos, validacion con Zod y envio) se descarga al abrir el dialogo, no con la pagina.
const load = () => import("./QuoteForm");
const QuoteForm = dynamic(load, {
  ssr: false,
  loading: () => (
    <div className="grid min-h-60 place-items-center" aria-hidden="true">
      <span className="size-8 animate-spin rounded-full border-[3px] border-line border-t-blue" />
    </div>
  ),
});

type Action = { label: string; title: string };
/** Accion con etiqueta corta para pantallas angostas (la completa queda como nombre accesible). */
type ShortAction = Action & { short: string };

export type QuoteCopy = FieldsCopy & {
  title: string;
  steps: { label: string; progress: string; one: string; two: string };
  next: Action;
  back: Action;
  step2: {
    summary: { heading: string; name: string; phone: string; service: string };
    plan: { heading: string };
    options: { heading: string };
    support: {
      label: string;
      helpLabel: string;
      helpTitle: string;
      benefitsHeading: string;
      conditionsHeading: string;
      periodLabel: string;
      start: string;
      periods: Record<"m3" | "m6" | "y1", string>;
      monthly: string;
    };
    code: { label: string; text: string };
    totals: { heading: string; plan: string; support: string; code: string; net: string; iva: string; total: string; from: string };
    general: string;
  };
  cancel: Action;
  mail: ShortAction;
  whatsapp: ShortAction;
  share: QuoteShareLabels;
  done: {
    title: string;
    mail: string;
    whatsapp: string;
    fallback: string;
    mailLinkTitle: string;
    close: Action;
  };
  errors: Record<QuoteField, string>;
};

export type QuoteDialogProps = {
  locale: Locale;
  copy: QuoteCopy;
  privacyHref: string;
  termsHref: string;
  /** Boton que abre el dialogo. */
  trigger: { label: string; title: string; className: string };
  /** Servicio preseleccionado, plan, descripcion legible ("Servicio · Plan") y, si el plan tiene precios, su oferta para el paso 2. */
  quote: { service: string; plan: string; summary: string; offer?: QuoteOffer };
  /** Destinos de las dos alternativas de envio. */
  contact: { email: string; whatsappHref: string };
};

/**
 * Dialogo modal estilo Google (Material) en dos pasos: 1) datos del cliente, 2) detalle de la cotizacion con precios
 * (IVA incluido), opcionales y totales. Solo en el paso 2 aparecen los botones de envio. Mientras no hay un servicio de
 * envio, ofrece dos alternativas con todo el detalle ya escrito: abrir la app de correo o WhatsApp. Usa <dialog>
 * nativo: trampa de foco, Escape y orden de tabulacion los resuelve el navegador. El formulario se monta al abrir por
 * primera vez y se reinicia en cada apertura.
 */
export default function QuoteDialog({
  locale,
  copy,
  privacyHref,
  termsHref,
  trigger,
  quote,
  contact,
}: QuoteDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [session, setSession] = useState(0);

  const open = () => {
    setSession((n) => n + 1);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        title={trigger.title}
        onClick={open}
        // Adelanta la descarga del formulario cuando el puntero o el foco llegan al boton.
        onPointerEnter={() => void load()}
        onFocus={() => void load()}
        className={trigger.className}
      >
        {trigger.label}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        // Un clic sobre el velo (el propio <dialog>, que no tiene relleno) lo cierra.
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
        className="g-dialog m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[38rem] flex-col overflow-hidden rounded-[28px] bg-paper p-0 text-ink shadow-raised open:flex"
      >
        {session > 0 ? (
          <QuoteForm
            key={session}
            locale={locale}
            copy={copy}
            privacyHref={privacyHref}
            termsHref={termsHref}
            quote={quote}
            contact={contact}
            titleId={titleId}
            onClose={close}
          />
        ) : null}
      </dialog>
    </>
  );
}
