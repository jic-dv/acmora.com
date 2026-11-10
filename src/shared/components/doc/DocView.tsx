import { ArrowRight, Check, ChevronDown, Gift } from "lucide-react";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/routing";
import { getCopy } from "@/content/docs";
import AppLink from "@/shared/components/core/AppLink";
import { buttonStyles } from "@/shared/components/core/Button";
import BrandMark from "@/shared/components/core/BrandMark";
import Icon from "@/shared/components/core/Icon";
import Tabs from "@/shared/components/core/Tabs";
import type { Block, Doc, DocCta, PlanItem } from "@/shared/lib/doc";
import { faqId } from "@/shared/lib/faq-id";
import { cn } from "@/shared/lib/cn";
import { resolveTarget } from "@/shared/lib/inline";
import { TONE_CLASS } from "@/shared/lib/tone";
import QuoteButton from "@/features/contact/components/QuoteButton";
import ProjectsGrid from "@/features/projects/components/ProjectsGrid";
import Inline from "./Inline";
import PlanDetails from "./PlanDetails";

/** Boton del plan: abre el dialogo de cotizacion (o enlaza al contacto si el plan no declara servicio). */
function PlanCta({ plan, locale, variant, className }: { plan: PlanItem; locale: Locale; variant: "primary" | "outline"; className?: string }) {
  if (plan.quote) return <QuoteButton locale={locale} label={plan.ctaLabel} title={plan.ctaTitle} variant={variant} className={className} quote={plan.quote} />;
  return (
    <AppLink href={hrefOf(plan.href, locale)} title={plan.ctaTitle} className={cn(buttonStyles({ variant }), className)}>
      {plan.ctaLabel}
    </AppLink>
  );
}

const ROW_TONE: Record<string, string> = { "`+`": "add", "`~`": "chg", "`-`": "del" };
const hrefOf = (target: string, locale: Locale) => resolveTarget(target, locale).href;

function BlockView({ block, locale }: { block: Block; locale: Locale }) {
  const ui = getCopy(locale).ui;
  switch (block.type) {
    case "p":
      return (
        <p>
          <Inline text={block.text} locale={locale} />
        </p>
      );
    case "note":
      return (
        <p className="rounded-card bg-blue-soft px-4 py-3">
          <Inline text={block.text} locale={locale} />
        </p>
      );
    case "ul":
    case "ol": {
      const Tag = block.type;
      return (
        <Tag>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline text={item} locale={locale} />
            </li>
          ))}
        </Tag>
      );
    }
    case "dl":
      return (
        <dl>
          {block.items.map((item) => (
            <div key={item.term}>
              <dt>{item.term}</dt>
              <dd>
                <Inline text={item.desc} locale={locale} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "table":
      // Region con nombre y foco: permite desplazar la tabla con teclado en pantallas angostas (WCAG 2.1.1).
      return (
        <div role="region" aria-label={ui.tableRegion(block.caption)} tabIndex={0} className="mt-6 overflow-x-auto rounded-card border border-line">
          <table>
            <caption>{block.caption}</caption>
            <thead>
              <tr>
                {block.head.map((h, c) => (
                  <th key={h} scope="col" className={block.nowrap?.includes(c) ? "whitespace-nowrap" : undefined}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className={cn(ROW_TONE[cell.split(" ")[0] ?? ""], block.nowrap?.includes(c) && "whitespace-nowrap")}>
                      <Inline text={cell} locale={locale} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "cards":
      return (
        <ul className={cn("mt-8 grid max-w-none list-none gap-5 pl-0 sm:grid-cols-2", block.cols !== 2 && "lg:grid-cols-3")}>
          {block.items.map((item) => (
            <li key={item.title} className="relative mt-0 flex max-w-none flex-col rounded-card bg-paper p-6 shadow-card">
              {item.badge ? <span className="absolute right-5 top-5 rounded-pill bg-blue-soft px-3 py-0.5 text-sm font-medium text-blue">{item.badge}</span> : null}
              {item.icon ? (
                <span className={cn("mb-4 grid size-11 place-items-center rounded-full", TONE_CLASS[item.tone ?? "blue"])}>
                  <Icon name={item.icon} size={22} />
                </span>
              ) : null}
              {item.meta ? <p className="mt-0 text-sm text-ink-soft">{item.meta}</p> : null}
              <h3 className="text-xl font-medium leading-snug">{item.title}</h3>
              {item.text ? <p className="mt-3 text-ink-soft">{item.text}</p> : null}
              {item.links ? (
                <ul className="mt-5 grid max-w-none list-none gap-0.5 border-t border-line pt-3 pl-0">
                  {item.links.map((l) => (
                    <li key={l.href} className="mt-0 max-w-none">
                      <AppLink
                        href={hrefOf(l.href, locale)}
                        title={l.title}
                        className="plain group -mx-3 flex min-h-12 items-center gap-3 rounded-card px-3 py-2 font-medium text-ink no-underline transition-colors duration-(--duration-enter) hover:bg-surface"
                      >
                        {l.icon ? <Icon name={l.icon} size={20} className="shrink-0 text-ink-soft" /> : null}
                        <span className="flex-1">{l.label}</span>
                        <ArrowRight aria-hidden="true" size={18} className="shrink-0 text-ink-soft transition-transform duration-(--duration-enter) group-hover:translate-x-0.5" />
                      </AppLink>
                    </li>
                  ))}
                </ul>
              ) : null}
              {item.href && item.linkLabel ? (
                <p className="mt-auto pt-5">
                  <AppLink href={hrefOf(item.href, locale)} title={item.linkTitle ?? item.linkLabel} className="plain inline-flex min-h-11 items-center gap-1.5 font-medium text-blue no-underline hover:text-blue-hover hover:underline">
                    {item.linkLabel}
                    <ArrowRight aria-hidden="true" size={18} />
                  </AppLink>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="mt-8 grid max-w-none list-none gap-6 pl-0 sm:grid-cols-2 lg:grid-cols-4">
          {block.items.map((item, i) => (
            <li key={item.title} className="mt-0 max-w-none">
              <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-brand text-lg font-medium text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-xl font-medium leading-snug">{item.title}</h3>
              <p className="mt-2 text-ink-soft">{item.text}</p>
            </li>
          ))}
        </ol>
      );
    case "columns":
      return (
        <div className="grid gap-14 md:grid-cols-2 md:gap-0">
          {block.items.map((c, i) => (
            <div key={c.heading} className={cn("flex flex-col", i === 0 ? "md:pr-12 lg:pr-16" : "md:border-l md:border-night-line md:pl-12 lg:pl-16")}>
              <p className="font-mono text-sm uppercase tracking-widest text-night-soft">{c.eyebrow}</p>
              <h2 className="mt-4 max-w-[22ch] text-[clamp(1.6rem,1.2rem+1.4vw,2.25rem)] font-medium leading-[1.15] tracking-[-0.01em] text-balance text-white">{c.heading}</h2>
              <p className="mt-5 max-w-[48ch] text-lg text-night-soft">{c.text}</p>
              <ul className="mt-10 grid max-w-none list-none pl-0">
                {c.links.map((l) => (
                  <li key={l.href} className="mt-0 max-w-none border-t border-night-line first:border-t-0">
                    <AppLink href={hrefOf(l.href, locale)} title={l.title} className="plain group flex min-h-[4.5rem] items-center gap-4 text-white no-underline transition-colors duration-(--duration-enter) hover:text-sky">
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white">
                        <Icon name={l.icon} size={22} />
                      </span>
                      <span className="flex-1">
                        <span className="block text-lg font-medium">{l.label}</span>
                        {l.meta ? <span className="block text-sm text-night-soft">{l.meta}</span> : null}
                      </span>
                      <ArrowRight aria-hidden="true" size={20} className="shrink-0 transition-transform duration-(--duration-enter) group-hover:translate-x-1" />
                    </AppLink>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <AppLink href={hrefOf(c.action.href, locale)} title={c.action.title} className={buttonStyles({ variant: "outline-dark" })}>
                  {c.action.label}
                </AppLink>
              </div>
            </div>
          ))}
        </div>
      );
    case "feature":
      return (
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
          <div className="feature-panel grid gap-5 rounded-[28px] p-6 sm:grid-cols-2 sm:p-10">
            {block.highlights.map((h) => (
              <div key={h.label} className="grid justify-items-center gap-5 rounded-card bg-white/70 px-6 py-10 text-center text-[#202124] backdrop-blur-sm">
                <span className="grid size-20 place-items-center rounded-full bg-white text-brand shadow-sm">
                  <Icon name={h.icon} size={36} />
                </span>
                <span className="text-lg font-medium">{h.label}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="font-mono text-sm uppercase tracking-widest text-ink-soft">{block.eyebrow}</p>
            <h2 className="mt-4 max-w-[20ch] text-[clamp(1.6rem,1.2rem+1.4vw,2.25rem)] font-medium leading-[1.15] tracking-[-0.01em] text-balance">{block.heading}</h2>
            <div className="mt-8">
              <AppLink href={hrefOf(block.action.href, locale)} title={block.action.title} className={buttonStyles({ variant: "outline" })}>
                {block.action.label}
              </AppLink>
            </div>
          </div>
        </div>
      );
    case "iconrow":
      return (
        <div className="mt-16 text-center">
          <p className="mx-auto font-mono text-sm uppercase tracking-widest text-ink-soft">{block.eyebrow}</p>
          <h2 className="mx-auto mt-4 max-w-[28ch] text-[clamp(1.5rem,1.15rem+1.2vw,2.25rem)] font-medium leading-tight tracking-[-0.01em] text-balance">{block.heading}</h2>
          <ul className="mx-auto mt-12 grid max-w-none list-none grid-cols-2 gap-x-6 gap-y-10 pl-0 lg:grid-cols-4">
            {block.items.map((it) => (
              <li key={it.label} className="mt-0 grid max-w-none justify-items-center gap-3">
                <span className={cn("grid size-16 place-items-center rounded-full", TONE_CLASS[it.tone ?? "blue"])}>
                  <Icon name={it.icon} size={30} />
                </span>
                <span className="font-medium">{it.label}</span>
                <span className="max-w-[24ch] text-sm text-ink-soft">{it.text}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "timeline":
      return (
        <ol aria-label={block.label} className="mt-12 grid max-w-none list-none gap-8 pl-0 lg:grid-cols-3 lg:gap-6">
          {block.items.map((it, i) => {
            // Primera frase: de que trata el paso; las demas, lo que incluye, para leerlo de un vistazo.
            const [lead, ...rest] = it.text.split(/(?<=\.)\s+/);
            const last = i === block.items.length - 1;
            return (
              <li key={it.title} className="mt-0 flex max-w-none flex-col">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-white text-xl font-medium text-[#0645e8] shadow-raised">
                    {i + 1}
                  </span>
                  {last ? null : <span aria-hidden="true" className="hidden h-0 flex-1 border-t-2 border-dashed border-white/40 lg:block" />}
                </div>
                <div className="mt-5 flex flex-1 flex-col rounded-card bg-white/10 p-6 ring-1 ring-white/20">
                  <span className="grid size-11 place-items-center rounded-full bg-white/15 text-white">
                    <Icon name={it.icon} size={22} />
                  </span>
                  <h3 className="mt-5 text-2xl font-medium leading-snug text-white">{it.title}</h3>
                  <p className="mt-3 text-night-soft">{lead}</p>
                  {rest.length > 0 ? (
                    <ul className="mt-4 grid max-w-none list-none gap-2.5 border-t border-white/15 pl-0 pt-4">
                      {rest.map((r) => (
                        <li key={r} className="mt-0 flex max-w-none gap-2.5 text-[0.9375rem] text-white">
                          <Check aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      );
    case "projects":
      return <ProjectsGrid items={block.items} filters={block.filters} />;
    case "tabs":
      return (
        <Tabs
          label={block.label}
          scroll={ui.tabs}
          items={block.items.map((t) => ({
            id: t.id,
            label: t.label,
            title: t.title,
            icon: t.icon ? <Icon name={t.icon} size={18} /> : undefined,
            panel: t.blocks.map((b, i) => <BlockView key={i} block={b} locale={locale} />),
          }))}
        />
      );
    case "faq":
      // Acordeon nativo: <details> funciona sin JavaScript, con teclado y lectores de pantalla.
      return (
        <div className="mt-8 grid max-w-none gap-3">
          {block.items.map((item) => (
            <details key={item.q} id={faqId(item.q)} data-faq="" className="group rounded-card border border-line bg-paper open:shadow-card">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-5 py-3 text-lg font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown aria-hidden="true" size={22} className="shrink-0 text-ink-soft transition-transform duration-(--duration-enter) group-open:rotate-180" />
              </summary>
              <p className="mt-0 max-w-none px-5 pb-5 text-ink-soft">
                <Inline text={item.a} locale={locale} />
              </p>
            </details>
          ))}
        </div>
      );
    case "capacity": {
      const open = block.taken < block.total;
      return (
        <div className="mt-6 max-w-none rounded-card bg-paper p-6 shadow-card ring-1 ring-line sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="grid max-w-[48ch] gap-2">
              <p className="m-0 flex max-w-none items-center gap-2.5 text-sm font-medium uppercase tracking-widest text-ink-soft">
                <span aria-hidden="true" className="relative flex size-2.5">
                  {open ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#34a853] opacity-70" /> : null}
                  <span className={cn("relative inline-flex size-2.5 rounded-full", open ? "bg-[#1e8e3e]" : "bg-del")} />
                </span>
                {block.heading}
              </p>
              <p className="m-0 max-w-none text-2xl font-medium text-ink">{block.status}</p>
              <p className="m-0 max-w-none text-ink-soft">
                <Inline text={block.text} locale={locale} />
              </p>
            </div>
            <div className="grid justify-items-start gap-4 sm:justify-items-end">
              <div role="img" aria-label={block.meter} className="flex gap-1.5">
                {Array.from({ length: block.total }, (_, i) => (
                  <span key={i} className={cn("h-2.5 w-10 rounded-pill", i < block.taken ? "bg-line-strong" : "bg-blue")} />
                ))}
              </div>
              <AppLink href={hrefOf(block.action.href, locale)} title={block.action.title} className={buttonStyles()}>
                {block.action.label}
                <ArrowRight aria-hidden="true" size={18} />
              </AppLink>
            </div>
          </div>
          {block.bonus ? (
            <p className="m-0 mt-5 flex max-w-none items-center gap-2.5 rounded-card bg-blue-soft px-4 py-3 font-medium text-blue">
              <Gift aria-hidden="true" size={20} className="shrink-0" />
              {block.bonus}
            </p>
          ) : null}
        </div>
      );
    }
    case "overview": {
      const SHOWN = 6;
      // Con una o dos filas de mas no vale la pena plegar: se muestran todas.
      const rest = block.items.length > SHOWN + 1 ? block.items.slice(SHOWN) : [];
      const first = rest.length > 0 ? block.items.slice(0, SHOWN) : block.items;
      const row = (item: string) => (
        <li key={item} className="m-0 flex max-w-none items-start gap-2.5 text-ink-soft">
          <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-blue-soft text-blue">
            <Check size={12} strokeWidth={3} />
          </span>
          <span>
            <Inline text={item} locale={locale} />
          </span>
        </li>
      );
      return (
        <div className="mt-6 grid max-w-none gap-5">
          <p className="m-0 max-w-[62ch] text-lg leading-relaxed text-ink-soft sm:text-xl">
            <Inline text={block.text} locale={locale} />
          </p>
          <div className="rounded-card bg-surface p-5 ring-1 ring-line sm:p-6">
            <p className="m-0 font-medium">{block.heading}</p>
            <ul className="m-0 mt-3 grid max-w-none list-none gap-x-10 gap-y-2.5 pl-0 md:grid-cols-2">{first.map(row)}</ul>
            {rest.length > 0 ? (
              <details className="group mt-2.5">
                <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-pill py-1 pr-2 font-medium text-blue [&::-webkit-details-marker]:hidden">
                  <ChevronDown aria-hidden="true" size={18} className="transition-transform duration-(--duration-enter) group-open:rotate-180" />
                  <span className="group-open:hidden">{block.more.replace("{n}", String(rest.length))}</span>
                  <span className="hidden group-open:inline">{block.less}</span>
                </summary>
                <ul className="m-0 mt-2.5 grid max-w-none list-none gap-x-10 gap-y-2.5 pl-0 md:grid-cols-2">{rest.map(row)}</ul>
              </details>
            ) : null}
          </div>
        </div>
      );
    }
    case "plans": {
      const count = block.items.length;
      return (
        <ul
          className={cn(
            "mt-8 grid max-w-none list-none items-stretch gap-5 pl-0",
            count === 2 && "md:grid-cols-2",
            count >= 3 && "md:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {block.items.map((plan) => {
            // Un solo plan (complemento) ocupa todo el ancho y reparte su contenido en dos columnas.
            const wide = count === 1;
            return (
              <li
                key={plan.name}
                className={cn(
                  "relative mt-0 max-w-none rounded-card bg-paper p-6 sm:p-7",
                  wide ? "grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-12" : "flex flex-col",
                  plan.featured ? "border-2 border-blue shadow-raised" : "shadow-card",
                )}
              >
                {plan.featured ? <span className="absolute -top-3.5 left-6 rounded-pill bg-blue px-3 py-0.5 text-sm font-medium text-on-blue">{ui.featured}</span> : null}
                <div className="flex flex-col">
                  <h3 className="text-xl font-medium">{plan.name}</h3>
                  <p className="mt-4 text-[2.125rem] font-medium leading-none tracking-tight">{plan.price}</p>
                  <p className="mt-2 text-sm text-ink-soft">{plan.priceNote}</p>
                  <p className="mt-5 text-ink-soft">{plan.audience}</p>
                  <p className="mt-4 text-sm font-medium">{plan.timeframe}</p>
                  {wide ? (
                    <div className="mt-auto pt-7">
                      <PlanCta plan={plan} locale={locale} variant="primary" />
                    </div>
                  ) : null}
                </div>
                <div className={cn("flex flex-1 flex-col", !wide && "mt-5")}>
                  <ul className={cn("grid max-w-none list-none gap-3 border-t border-line pt-5 pl-0", wide && "md:border-l md:border-t-0 md:pl-10 md:pt-0")}>
                    {plan.includes.map((inc) => (
                      <li key={inc} className="mt-0 flex max-w-none gap-3">
                        <Check aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-add" />
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                  {!wide ? (
                    <div className="mt-auto pt-7">
                      <PlanCta plan={plan} locale={locale} variant={plan.featured ? "primary" : "outline"} className="w-full" />
                      {plan.detail ? <PlanDetails detail={plan.detail} /> : null}
                    </div>
                  ) : plan.detail ? (
                    <PlanDetails detail={plan.detail} />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      );
    }
  }
}

export function CtaBand({ cta, locale }: { cta: DocCta; locale: Locale }) {
  return (
    <section aria-labelledby="h-cta" className="panel-night on-dark rounded-panel p-8 text-white sm:p-12 lg:p-16">
      <Backdrop variant="cta" />
      <h2 id="h-cta" className="max-w-[24ch] text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] font-medium leading-[1.15] tracking-[-0.01em] text-balance">
        {cta.title}
      </h2>
      <p className="mt-5 max-w-[56ch] text-lg text-night-soft">
        <Inline text={cta.text} locale={locale} />
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <AppLink href={hrefOf(cta.primary.href, locale)} title={cta.primary.title} className={buttonStyles({ variant: "accent", size: "lg" })}>
          {cta.primary.label}
        </AppLink>
        {cta.secondary ? (
          <AppLink href={hrefOf(cta.secondary.href, locale)} title={cta.secondary.title} className={buttonStyles({ variant: "outline-dark", size: "lg" })}>
            {cta.secondary.label}
          </AppLink>
        ) : null}
      </div>
    </section>
  );
}

type Props = {
  doc: Doc;
  locale: Locale;
  /** Contenido React que se inserta al final de la seccion con ese id (por ejemplo, un formulario). */
  slots?: Record<string, ReactNode>;
};

/** Forma abstracta de fondo: circulo o anillo translucido, solo ornamento (sin foco ni lectura). */
function Orb({ className }: { className: string }) {
  return <span aria-hidden="true" className={cn("pointer-events-none absolute -z-10 rounded-full", className)} />;
}

/**
 * Fondos decorativos de cada tipo de panel. Menos es mas: la "A" de la marca aparece una sola vez en todo el home (contorno tenue
 * en el panel oscuro de servicios); el resto son circulos y anillos translucidos que combinan con el color de cada seccion.
 * `cta` es el fondo de la banda final.
 */
function Backdrop({ variant }: { variant: "dark" | "brand" | "soft" | "mist" | "cta" }) {
  switch (variant) {
    case "dark":
      return (
        <>
          <BrandMark outline className="-right-16 -top-20 w-[24rem] text-white/[0.14] sm:w-[34rem]" />
          <Orb className="-bottom-40 -left-32 size-[28rem] bg-brand/20 blur-3xl" />
        </>
      );
    case "cta":
      return (
        <>
          <Orb className="-right-24 -top-32 size-[26rem] bg-brand/30 blur-3xl" />
          <Orb className="-bottom-28 left-1/3 size-[22rem] border border-white/10" />
        </>
      );
    case "brand":
      return (
        <>
          <Orb className="-right-28 -top-28 size-[24rem] bg-white/[0.08]" />
          <Orb className="-bottom-40 -left-24 size-[30rem] bg-[#001a6e]/35 blur-2xl" />
          <Orb className="-right-10 bottom-10 size-[18rem] border border-white/15" />
        </>
      );
    case "soft":
      return (
        <>
          <Orb className="-bottom-32 -right-24 size-[28rem] bg-brand/[0.07]" />
          <Orb className="-left-16 -top-24 size-72 border border-brand/20" />
        </>
      );
    case "mist":
      return (
        <>
          <Orb className="-bottom-28 -left-20 size-[26rem] bg-ink/[0.04]" />
          <Orb className="-right-12 -top-20 size-72 border border-ink/10" />
        </>
      );
  }
}

export default function DocView({ doc, locale, slots }: Props) {
  return (
    <>
      {doc.sections.map((s) => {
        const heading = s.bare ? null : (
          <header className={cn("max-w-[52rem]", s.align === "center" && "mx-auto text-center")}>
            {s.eyebrow ? <p className="font-mono text-sm uppercase tracking-widest text-night-soft">{s.eyebrow}</p> : null}
            <h2 id={`h-${s.id}`} className="mt-4 text-[clamp(1.6rem,1.2rem+1.4vw,2.25rem)] font-medium leading-[1.15] tracking-[-0.01em] text-balance">
              {s.heading}
            </h2>
            {s.intro ? (
              <p className={cn("mt-4 text-lg text-night-soft", s.align === "center" && "mx-auto max-w-[48ch]")}>
                <Inline text={s.intro} locale={locale} />
              </p>
            ) : null}
          </header>
        );

        // Paneles oscuros y azules: texto claro sobre el fondo, con la "A" de la marca detras.
        if (s.variant === "dark" || s.variant === "brand") {
          return (
            <section
              key={s.id}
              aria-label={s.bare ? s.heading : undefined}
              aria-labelledby={s.bare ? undefined : `h-${s.id}`}
              className={cn(s.variant === "dark" ? "panel-night" : "panel-brand", "on-dark my-3 rounded-panel p-8 text-white sm:my-5 sm:p-12 lg:p-16")}
            >
              <Backdrop variant={s.variant} />
              {heading}
              {s.blocks.map((b, i) => (
                <BlockView key={i} block={b} locale={locale} />
              ))}
              {slots?.[s.id]}
            </section>
          );
        }

        const light = (
          <section
            key={s.id}
            aria-label={s.bare ? s.heading : undefined}
            aria-labelledby={s.bare ? undefined : `h-${s.id}`}
            className="doc py-6 sm:py-10"
          >
            {s.bare ? null : (
              <>
                <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
                  <div className="flex items-center gap-4">
                    {s.icon ? (
                      <span className={cn("grid size-12 shrink-0 place-items-center rounded-full sm:size-14", TONE_CLASS[s.tone ?? "blue"], (s.variant === "soft" || s.variant === "mist") && "!bg-paper shadow-card")}>
                        <Icon name={s.icon} size={26} />
                      </span>
                    ) : null}
                    <h2 id={`h-${s.id}`} className="text-[clamp(1.5rem,1.15rem+1.2vw,2.25rem)] font-medium leading-tight tracking-[-0.01em] text-balance">
                      {s.heading}
                    </h2>
                  </div>
                  {s.action ? (
                    <AppLink href={hrefOf(s.action.href, locale)} title={s.action.title} className={buttonStyles({ variant: "outline" })}>
                      {s.action.label}
                      <ArrowRight aria-hidden="true" size={18} />
                    </AppLink>
                  ) : null}
                </header>
                {s.intro ? (
                  <p className="mt-5 max-w-[62ch] text-lg text-ink-soft">
                    <Inline text={s.intro} locale={locale} />
                  </p>
                ) : null}
              </>
            )}
            {s.blocks.map((b, i) => (
              <BlockView key={i} block={b} locale={locale} />
            ))}
            {slots?.[s.id]}
          </section>
        );

        // Secciones claras con fondo propio: el panel (tinte azul o gris) envuelve a la seccion, que sigue sin borde ni sombra.
        if (s.variant === "soft" || s.variant === "mist") {
          return (
            <div
              key={s.id}
              className={cn("relative isolate my-3 overflow-hidden rounded-panel px-6 py-4 sm:my-5 sm:px-10 sm:py-8 lg:px-14", s.variant === "soft" ? "bg-blue-soft" : "bg-surface-strong")}
            >
              <Backdrop variant={s.variant} />
              {light}
            </div>
          );
        }
        return light;
      })}
      {doc.cta ? <CtaBand cta={doc.cta} locale={locale} /> : null}
    </>
  );
}
