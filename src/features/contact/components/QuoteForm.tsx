"use client";

import AppLink from "@/shared/components/core/AppLink";
import Button from "@/shared/components/core/Button";
import { cn } from "@/shared/lib/cn";
import { formatAmount } from "@/shared/lib/money";
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleQuestionMark, Gift, Mail, MessageCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { quoteSummary, type QuoteChoice } from "../quote-offer";
import { buildQuoteMessage, mailtoUrl, whatsappUrl } from "../quote-message";
import { SERVICE_OPTIONS, type QuoteValues } from "../state";
import type { QuoteDialogProps } from "./QuoteDialog";
import QuoteFields, { leftWithValue, openLink, useLiveValidation } from "./QuoteFields";

/**
 * Contenido del dialogo de cotizacion (los dos pasos, la validacion y el envio). Va en su propio modulo y se descarga recien al
 * abrir el dialogo (o al pasar el puntero por el boton): asi la validacion con Zod no pesa en la carga de cada pagina.
 */
export default function QuoteForm({
  locale,
  copy,
  privacyHref,
  termsHref,
  quote,
  contact,
  titleId,
  onClose,
}: Omit<QuoteDialogProps, "trigger"> & { titleId: string; onClose: () => void }) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const { shown, sync, fieldOf, validateAll } = useLiveValidation(formRef);
  const bodyRef = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [data, setData] = useState<QuoteValues | null>(null);
  const [sent, setSent] = useState<"mail" | "whatsapp" | null>(null);
  const [choice, setChoice] = useState<QuoteChoice>({ support: null, code: false });
  const [help, setHelp] = useState(false);
  // Sentido de la transicion entre pasos y fase de salida (el contenido actual se desvanece antes de mostrar el otro paso).
  const [dir, setDir] = useState<"next" | "prev" | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Cambia de paso con una salida corta del contenido actual y la entrada del nuevo (eje horizontal, como en Google).
  const go = (to: 1 | 2, values?: QuoteValues) => {
    setDir(to === 2 ? "next" : "prev");
    setLeaving(true);
    timer.current = window.setTimeout(() => {
      if (values) setData(values);
      setStep(to);
      setLeaving(false);
      requestAnimationFrame(() => {
        bodyRef.current?.scrollTo({ top: 0 });
        if (to === 2) step2Ref.current?.focus({ preventScroll: true });
        else formRef.current?.querySelector<HTMLElement>('input[name="name"]')?.focus();
      });
    }, 140);
  };

  // Paso 1 -> 2: valida los cuatro campos; si hay errores se queda y enfoca el primero.
  const next = () => {
    if (leaving) return;
    const values = validateAll();
    if (values) go(2, values);
  };

  const back = () => {
    if (!leaving) go(1);
  };

  // El plan se cotiza solo si el servicio elegido sigue siendo el del plan; si lo cambió, es una cotización general.
  const offer = data && quote.offer && data.service === quote.service ? quote.offer : null;
  const fmt = (n: number) => (offer ? formatAmount({ amount: n, currency: offer.currency }, locale) : String(n));
  const summary = offer ? quoteSummary(offer, choice, { plan: copy.step2.totals.plan, support: copy.step2.totals.support, code: copy.step2.totals.code }) : null;

  const send = (via: "mail" | "whatsapp") => {
    if (!data) return;
    const l = copy.share;
    const detail: string[] = [];
    if (offer && summary) {
      detail.push(...summary.items.map((i) => `- ${i.label} (${fmt(i.amount)})`));
      if (offer.support && !choice.support) {
        detail.push(`- ${l.noSupport}`);
        if (offer.support.monthly !== null) detail.push(`- ${l.monthly}: ${fmt(offer.support.monthly)}`);
      }
      if (offer.code && !choice.code) detail.push(`- ${l.noCode}`);
      if (offer.bonus) detail.push(`- ${offer.bonus}`);
      detail.push(`- ${l.net}: ${fmt(summary.net)}`, `- ${l.iva}: ${fmt(summary.iva)}`, `- ${l.total}: ${fmt(summary.total)}`);
    }
    const message = buildQuoteMessage({
      labels: l,
      serviceName: copy.services[data.service as (typeof SERVICE_OPTIONS)[number]],
      plan: quote.plan,
      values: data,
      detail,
    });
    openLink(
      via === "mail"
        ? mailtoUrl(contact.email, message)
        : whatsappUrl(contact.whatsappHref, message),
      via === "whatsapp",
    );
    setSent(via);
  };

  const closeButton = (
    <button
      type="button"
      title={copy.done.close.title}
      aria-label={copy.done.close.title}
      onClick={onClose}
      className="-mr-2 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors duration-(--duration-enter) hover:bg-surface hover:text-ink"
    >
      <X aria-hidden="true" size={22} />
    </button>
  );

  if (sent) {
    return (
      <div role="status" className="flex min-h-0 flex-col [&_p]:mt-0">
        <header className="flex shrink-0 items-start justify-between gap-4 px-5 pb-2 pt-5 sm:px-6">
          <h2
            id={titleId}
            className="text-xl font-medium leading-snug sm:text-2xl"
          >
            {copy.done.title}
          </h2>
          {closeButton}
        </header>
        <div className="quote-scroll grid min-h-0 gap-3 overflow-y-auto px-5 pb-4 sm:px-6">
          <p className="text-ink-soft">
            {sent === "mail" ? copy.done.mail : copy.done.whatsapp}
          </p>
          {sent === "mail" ? (
            <p className="text-sm text-ink-soft">
              {copy.done.fallback}{" "}
              <AppLink
                href={`mailto:${contact.email}`}
                title={copy.done.mailLinkTitle}
                className="text-blue underline underline-offset-4"
              >
                {contact.email}
              </AppLink>
            </p>
          ) : null}
        </div>
        <footer className="flex shrink-0 justify-end border-t border-line px-4 py-3 sm:px-6">
          <Button
            type="button"
            title={copy.done.close.title}
            onClick={onClose}
            autoFocus
            className="min-h-10 px-5 text-sm"
          >
            {copy.done.close.label}
          </Button>
        </footer>
      </div>
    );
  }

  const s2 = copy.step2;
  const panel = "rounded-[20px] border border-line-strong";
  const optionCard = "flex min-h-11 cursor-pointer flex-col items-start gap-1 rounded-[14px] border border-line-strong bg-paper p-3 transition-colors duration-(--duration-enter) hover:bg-surface has-[:checked]:border-blue has-[:checked]:bg-blue-soft has-[:checked]:ring-1 has-[:checked]:ring-blue";
  // Fila de una opcion con casilla: al marcarla, todo el contorno se sombrea en azul (como las tarjetas de los periodos).
  const optionBoxBase = "rounded-[14px] border border-line-strong px-3 py-2 transition-colors duration-(--duration-enter) sm:px-4";
  const optionBox = {
    addSupport: cn(optionBoxBase, "has-[input[name=addSupport]:checked]:border-blue has-[input[name=addSupport]:checked]:bg-blue-soft/40 has-[input[name=addSupport]:checked]:ring-1 has-[input[name=addSupport]:checked]:ring-blue"),
    addCode: cn(optionBoxBase, "has-[input[name=addCode]:checked]:border-blue has-[input[name=addCode]:checked]:bg-blue-soft/40 has-[input[name=addCode]:checked]:ring-1 has-[input[name=addCode]:checked]:ring-blue"),
  };
  const sectionTitle = "mt-0 text-base font-medium";
  // Dentro de un .doc, cada fila de <dl> hereda borde y relleno de la prosa: se anulan para controlar los espacios aqui.
  const noRules = "[&>div]:border-b-0 [&>div]:p-0 [&>div:first-child]:border-t-0";

  return (
    <form
      ref={formRef}
      noValidate
      onChange={(e) => sync({}, fieldOf(e.target) ?? undefined)}
      onBlur={(e) => {
        const f = fieldOf(e.target);
        if (f) sync({}, leftWithValue(e.target) ? f : undefined);
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (step === 1) next();
      }}
      className="flex min-h-0 flex-1 flex-col [&_p]:mt-0"
    >
      <header className="shrink-0 px-5 pb-3 pt-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-0.5">
            <h2
              id={titleId}
              className="text-xl font-medium leading-snug sm:text-2xl"
            >
              {copy.title}
            </h2>
            <p className="text-sm text-ink-soft">{quote.summary}</p>
          </div>
          {closeButton}
        </div>
        <div className="mt-4" role="group" aria-label={copy.steps.label}>
          <p aria-live="polite" className="text-sm font-medium text-blue">
            {copy.steps.progress.replace("{n}", String(step))} · {step === 1 ? copy.steps.one : copy.steps.two}
          </p>
          <div aria-hidden="true" className="mt-2 grid grid-cols-2 gap-1.5">
            <span className="h-1 rounded-full bg-blue" />
            <span className="h-1 overflow-hidden rounded-full bg-line">
              <span className={cn("block h-full origin-left rounded-full bg-blue transition-transform duration-[420ms] ease-(--ease-standard)", step === 2 && !leaving ? "scale-x-100" : "scale-x-0")} />
            </span>
          </div>
        </div>
      </header>

      <div ref={bodyRef} className={cn("quote-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-2 sm:px-6", leaving && "pointer-events-none")}>
        {/* Paso 1: datos del cliente. Se oculta (no se desmonta) en el paso 2 para conservar lo escrito. */}
        <div hidden={step !== 1} className={cn("content-start gap-4", step === 1 ? "grid" : "hidden", step === 1 && (leaving ? "step-out-next" : dir === "prev" && "step-in-prev"))}>
          <QuoteFields uid={uid} locale={locale} copy={copy} privacyHref={privacyHref} termsHref={termsHref} defaultService={quote.service} shown={shown} sync={sync} autoFocus />
        </div>

        {/* Paso 2, de lo mas importante a lo menos, en paneles con borde para ubicarse rapido: 1) plan y total, 2) opcionales, 3) desglose del precio, 4) datos. */}
        {step === 2 && data ? (
          <div ref={step2Ref} tabIndex={-1} className={cn("grid gap-3 pt-1 outline-none", leaving ? "step-out-prev" : "step-in-next")} data-testid="quote-step-2">
            {offer && summary ? (
              <>
                <section aria-labelledby={`${uid}-s-plan`} className={cn(panel, "bg-surface px-4 py-4 sm:px-5")}>
                  <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                    <div className="grid gap-0.5">
                      <h3 id={`${uid}-s-plan`} className="mt-0 text-sm text-ink-soft">{s2.plan.heading}</h3>
                      <p className="text-xl font-medium leading-snug">{offer.plan.name}</p>
                    </div>
                    <div className="grid gap-0.5 sm:text-right" aria-live="polite">
                      <p className="text-sm text-ink-soft">{s2.totals.total}</p>
                      <p className="text-[1.75rem] font-medium leading-none tracking-tight" data-testid="quote-total">{fmt(summary.total)}</p>
                      <p className="text-xs text-ink-soft">{s2.totals.net} {fmt(summary.net)} + {s2.totals.iva} {fmt(summary.iva)}</p>
                    </div>
                  </div>
                  {offer.plan.from ? <p className="mt-3 text-xs text-ink-soft">{s2.totals.from}</p> : null}
                  {offer.bonus ? (
                    <p className="mt-3 flex items-center gap-2 text-sm font-medium text-blue" data-testid="quote-bonus">
                      <Gift aria-hidden="true" size={16} className="shrink-0" />
                      {offer.bonus}
                    </p>
                  ) : null}
                </section>

                {offer.support || offer.code ? (
                  <section aria-labelledby={`${uid}-s-opt`} className={panel}>
                    <h3 id={`${uid}-s-opt`} className={cn(sectionTitle, "px-4 pt-3 sm:px-5")}>{s2.options.heading}</h3>
                    <div className="mt-1 grid gap-3 px-3 pb-3 sm:px-4">
                      {offer.support ? (
                        <div className={cn("grid gap-3", optionBox.addSupport)}>
                          <div className="flex items-start gap-2">
                            <label className="flex min-h-11 flex-1 cursor-pointer items-start gap-3.5">
                              <input
                                type="checkbox"
                                name="addSupport"
                                checked={choice.support !== null}
                                onChange={(e) => setChoice((c) => ({ ...c, support: e.target.checked ? (offer.support?.options[0]?.id ?? null) : null }))}
                                className="md-check mt-3"
                              />
                              <span className="grid gap-0.5 py-2">
                                <span className="font-medium">{s2.support.label}</span>
                                <span className="text-sm leading-snug text-ink-soft">
                                  {choice.support
                                    ? s2.support.start
                                    : offer.support.monthly !== null
                                      ? s2.support.monthly.replace("{price}", fmt(offer.support.monthly))
                                      : s2.support.start}
                                </span>
                              </span>
                            </label>
                            <button
                              type="button"
                              title={s2.support.helpTitle}
                              aria-label={s2.support.helpTitle}
                              aria-expanded={help}
                              aria-controls={`${uid}-help`}
                              onClick={() => setHelp((v) => !v)}
                              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-blue transition-colors duration-(--duration-enter) hover:bg-blue-soft"
                            >
                              <CircleQuestionMark aria-hidden="true" size={22} />
                            </button>
                          </div>

                          <div id={`${uid}-help`} hidden={!help} className={cn("gap-4 rounded-[16px] bg-surface p-4 text-sm", help ? "grid" : "hidden")}>
                            <p className="text-base font-medium">{s2.support.helpLabel}</p>
                            <div className="grid gap-1.5">
                              <p className="font-medium">{s2.support.benefitsHeading}</p>
                              <ul className="m-0 grid list-none gap-1.5 p-0">
                                {offer.support.benefits.map((b) => (
                                  <li key={b} className="m-0 flex gap-2">
                                    <Check aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-add" />
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="grid gap-1.5">
                              <p className="font-medium">{s2.support.conditionsHeading}</p>
                              <ul className="m-0 grid list-disc gap-1.5 pl-5 text-ink-soft">
                                {offer.support.conditions.map((c) => (
                                  <li key={c} className="m-0">{c}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {choice.support ? (
                            <fieldset className="m-0 border-0 p-0">
                              <legend className="mb-2 p-0 text-sm text-ink-soft">{s2.support.periodLabel}</legend>
                              <div className="grid grid-cols-3 gap-2">
                                {offer.support.options.map((o) => (
                                  <label key={o.id} className={optionCard}>
                                    <input
                                      type="radio"
                                      name="supportPeriod"
                                      value={o.id}
                                      checked={choice.support === o.id}
                                      onChange={() => setChoice((c) => ({ ...c, support: o.id }))}
                                      className="md-radio"
                                    />
                                    <span className="text-sm">{s2.support.periods[o.id]}</span>
                                    <span className="font-medium">{fmt(o.amount)}</span>
                                  </label>
                                ))}
                              </div>
                            </fieldset>
                          ) : null}
                        </div>
                      ) : null}

                      {offer.code ? (
                        <div className={optionBox.addCode}>
                          <label className="flex min-h-11 cursor-pointer items-start gap-3.5">
                            <input
                              type="checkbox"
                              name="addCode"
                              checked={choice.code}
                              onChange={(e) => setChoice((c) => ({ ...c, code: e.target.checked }))}
                              className="md-check mt-3"
                            />
                            <span className="grid flex-1 gap-0.5 py-2">
                              <span className="flex items-baseline justify-between gap-3">
                                <span className="font-medium">{s2.code.label}</span>
                                <span className="font-medium">{fmt(offer.code.amount)}</span>
                              </span>
                              <span className="text-sm leading-snug text-ink-soft">{s2.code.text}</span>
                            </span>
                          </label>
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                <details className={cn(panel, "group")}>
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[20px] px-4 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <span className={sectionTitle}>{s2.totals.heading}</span>
                    <ChevronDown aria-hidden="true" size={20} className="shrink-0 text-ink-soft transition-transform duration-(--duration-enter) group-open:rotate-180" />
                  </summary>
                  <dl className={cn("m-0 grid gap-1.5 px-4 pb-4 text-sm sm:px-5", noRules)}>
                    {summary.items.map((i) => (
                      <div key={i.key} className="m-0 flex items-baseline justify-between gap-4">
                        <dt className="m-0 text-ink-soft">{i.label}</dt>
                        <dd className="m-0">{fmt(i.amount)}</dd>
                      </div>
                    ))}
                    <div className="m-0 flex items-baseline justify-between gap-4 border-t border-line !pt-2">
                      <dt className="m-0 text-ink-soft">{s2.totals.net}</dt>
                      <dd className="m-0">{fmt(summary.net)}</dd>
                    </div>
                    <div className="m-0 flex items-baseline justify-between gap-4">
                      <dt className="m-0 text-ink-soft">{s2.totals.iva}</dt>
                      <dd className="m-0">{fmt(summary.iva)}</dd>
                    </div>
                    <div className="m-0 flex items-baseline justify-between gap-4 border-t border-line !pt-2 text-base font-medium">
                      <dt className="m-0">{s2.totals.total}</dt>
                      <dd className="m-0">{fmt(summary.total)}</dd>
                    </div>
                  </dl>
                </details>
              </>
            ) : (
              <p className="rounded-[20px] border border-blue bg-blue-soft p-4 leading-relaxed">{s2.general}</p>
            )}

            <details className={cn(panel, "group")}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[20px] px-4 sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className={sectionTitle}>{s2.summary.heading}</span>
                <ChevronDown aria-hidden="true" size={20} className="shrink-0 text-ink-soft transition-transform duration-(--duration-enter) group-open:rotate-180" />
              </summary>
              <dl className={cn("m-0 grid gap-x-4 gap-y-3 px-4 pb-4 text-sm sm:grid-cols-3 sm:px-5", noRules)}>
                {(
                  [
                    [s2.summary.name, data.name.trim()],
                    [s2.summary.phone, `${data.phoneCountry} ${data.phone.trim()}`],
                    [s2.summary.service, copy.services[data.service as (typeof SERVICE_OPTIONS)[number]] ?? data.service],
                  ] as const
                ).map(([term, desc]) => (
                  <div key={term} className="m-0 flex min-w-0 flex-col gap-0.5">
                    <dt className="m-0 text-xs text-ink-soft">{term}</dt>
                    <dd className="m-0 min-w-0 break-words font-medium">{desc}</dd>
                  </div>
                ))}
              </dl>
            </details>

          </div>
        ) : null}
      </div>

      {/* Pie fijo, siempre en una sola fila. Paso 1: Cancelar + Siguiente. Paso 2: Atras + los dos envios. */}
      <footer className="flex shrink-0 flex-nowrap items-center gap-1.5 border-t border-line px-3 py-3 sm:gap-2 sm:px-6">
        {step === 1 ? (
          <>
            <Button
              key="cancel"
              type="button"
              variant="text"
              title={copy.cancel.title}
              onClick={onClose}
              className="mr-auto min-h-10 px-3 text-sm sm:px-4"
            >
              {copy.cancel.label}
            </Button>
            <Button
              key="next"
              type="submit"
              title={copy.next.title}
              className="min-h-10 gap-1.5 px-5 text-sm"
            >
              {copy.next.label}
              <ArrowRight aria-hidden="true" size={16} />
            </Button>
          </>
        ) : (
          <>
            <Button
              key="back"
              type="button"
              variant="text"
              title={copy.back.title}
              onClick={back}
              className="mr-auto min-h-10 gap-1.5 px-3 text-sm sm:px-4"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              {copy.back.label}
            </Button>
            <Button
              key="mail"
              type="button"
              variant="outline"
              title={copy.mail.title}
              aria-label={copy.mail.label}
              onClick={() => send("mail")}
              className="min-h-10 gap-1.5 px-3 text-sm sm:px-5"
            >
              <Mail aria-hidden="true" size={16} />
              <span className="sm:hidden">{copy.mail.short}</span>
              <span className="hidden sm:inline">{copy.mail.label}</span>
            </Button>
            <Button
              key="whatsapp"
              type="button"
              title={copy.whatsapp.title}
              aria-label={copy.whatsapp.label}
              onClick={() => send("whatsapp")}
              className="min-h-10 gap-1.5 px-3 text-sm sm:px-5"
            >
              <MessageCircle aria-hidden="true" size={16} />
              <span className="sm:hidden">{copy.whatsapp.short}</span>
              <span className="hidden sm:inline">{copy.whatsapp.label}</span>
            </Button>
          </>
        )}
      </footer>
    </form>
  );
}
