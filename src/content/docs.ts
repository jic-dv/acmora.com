import type { Locale } from "@/i18n/routing";
import { capacityNow, monthKey } from "@/shared/constants/offer";
import { COMPANY, whatsappLink } from "@/shared/constants/site";
import { getPlanServices, getServices } from "@/features/catalog/services/catalog";
import { getProjects } from "@/features/projects/services/projects";
import type { Cell, Plan, PlanService, Service, SupportService } from "@/features/catalog/schemas/service";
import { toneOf } from "@/shared/constants/groups";
import type { IconName } from "@/shared/constants/icons";
import { PAGE_PATHNAME, type Block, type DetailSection, type Doc, type DocAction, type DocCta, type DocSection, type PageKey, type PlanDetail, type PlanItem, type QuoteOffer } from "@/shared/lib/doc";
import { formatClp, formatDate } from "@/shared/lib/format";
import { breakdown, formatAmount, formatPlanPrice, planAmount, withIva, type FxRates } from "@/shared/lib/money";
import { en } from "./en";
import { es, type Copy } from "./es";

/** Enlace de WhatsApp con el mensaje indicado de la copia del idioma. */
const wa = (locale: Locale, pick: (m: Copy["ui"]["whatsapp"]) => string) => whatsappLink(pick(getCopy(locale).ui.whatsapp));

export const getCopy = (locale: Locale): Copy => (locale === "es" ? es : en);

const CONTACT = "page:/contact";
const svc = (slug: string) => `service:${slug}`;

const action = (a: { label: string; title: string }, href: string): DocAction => ({ ...a, href });

type CtaCopy = { title: string; text: string; primary: { label: string; title: string }; secondary?: { label: string; title: string } };
/** Banda final: boton principal al formulario y, si hay texto secundario, al destino indicado (por defecto WhatsApp). */
const cta = (c: CtaCopy, secondaryHref: string): DocCta => ({
  title: c.title,
  text: c.text,
  primary: action(c.primary, CONTACT),
  ...(c.secondary ? { secondary: action(c.secondary, secondaryHref) } : {}),
});

const price = (clp: number, locale: Locale, fx: FxRates) => formatPlanPrice(clp, locale, fx);
const planPrice = (p: Plan, locale: Locale, fx: FxRates, fromLabel: string) => (p.from ? `${fromLabel} ${price(p.priceClp, locale, fx)}` : price(p.priceClp, locale, fx));
const PROCESS_ICONS: IconName[] = ["chat", "code", "rocket"];
/** Icono de cada compromiso de la pagina Nosotros, en el orden del contenido. */
const COMMITMENT_ICONS: IconName[] = ["file", "badge", "globe", "clock", "shield"];
const cheapest = (s: PlanService) => s.plans[0] as Plan;

const cellText = (c: Cell, locale: Locale): string => {
  const d = getCopy(locale).docs.service.compare;
  return c === "yes" ? d.yes : c === "no" ? d.no : c[locale];
};


/* Oferta: promesa (hero), como se mide el resultado, precio, garantias y cupos del mes (escasez real, shared/constants/offer.ts). */
type OfferKind = "web" | "crm";
const offerKind = (slug: string): OfferKind => (slug === "crm-personalizado" ? "crm" : "web");
const fillIn = (text: string, values: Record<string, string | number>) => Object.entries(values).reduce((t, [k, v]) => t.replaceAll(`{${k}}`, String(v)), text);
const monthName = (locale: Locale, date: Date) => new Intl.DateTimeFormat(locale === "es" ? "es-CL" : "en-US", { month: "long", timeZone: "America/Santiago" }).format(date);

/** Nombres del mes en curso y del siguiente (hora de Chile). */
function months(locale: Locale, now: Date) {
  const [y, m] = monthKey(now).split("-").map(Number);
  const next = new Date(Date.UTC(y ?? 2026, m ?? 1, 15));
  return { month: monthName(locale, now), next: monthName(locale, next) };
}

function resultsSection(locale: Locale, kind: OfferKind): DocSection {
  const r = getCopy(locale).docs.offer.results;
  const items: [{ title: string; text: string }, IconName][] = kind === "crm" ? [[r.scope, "file"], [r.deadline, "clock"]] : [[r.report, "chart"], [r.google, "search"], [r.deadline, "clock"]];
  return { id: "resultados", icon: "chart", heading: r.heading, intro: r.intro, blocks: [{ type: "cards", cols: kind === "crm" ? 2 : 3, items: items.map(([it, icon]) => ({ icon, title: it.title, text: it.text })) }] };
}

function guaranteesBlock(locale: Locale, kind: OfferKind): Block {
  const g = getCopy(locale).docs.offer.guarantees;
  const items: [{ title: string; text: string }, IconName][] = [[g.design, "layout"], [g.time, "clock"], ...(kind === "web" ? ([[g.speed, "gauge"]] as [{ title: string; text: string }, IconName][]) : []), [g.bugs, "shield"]];
  return { type: "cards", cols: kind === "crm" ? 3 : 2, items: items.map(([it, icon]) => ({ icon, title: it.title, text: it.text })) };
}

function guaranteesSection(locale: Locale, kind: OfferKind): DocSection {
  const g = getCopy(locale).docs.offer.guarantees;
  return { id: "garantias", icon: "shield", heading: g.heading, intro: g.intro, blocks: [guaranteesBlock(locale, kind)] };
}

/** Cupos del mes: cuantos quedan, el bono por confirmar dentro del mes (mientras haya cupos) y el boton para reservar. */
function capacityBlock(locale: Locale, now: Date): Extract<Block, { type: "capacity" }> {
  const k = getCopy(locale).docs.offer.capacity;
  const { total, taken, left } = capacityNow(now);
  const v = { ...months(locale, now), total, taken, left };
  const status = left === 0 ? k.status.none : left === 1 ? k.status.one : k.status.many;
  return {
    type: "capacity",
    heading: fillIn(k.heading, v),
    status: fillIn(status, v),
    text: left === 0 ? `${fillIn(k.text, v)} ${fillIn(k.full, v)}` : fillIn(k.text, v),
    total,
    taken,
    meter: fillIn(k.meter, v),
    ...(left > 0 ? { bonus: fillIn(k.bonus, v) } : {}),
    action: action(k.action, CONTACT),
  };
}

function capacitySection(locale: Locale, now: Date): DocSection {
  const block = capacityBlock(locale, now);
  return { id: "cupos", bare: true, heading: block.heading, blocks: [block] };
}

/** Texto del bono para el cotizador, solo si quedan cupos este mes. */
function quoteBonus(locale: Locale, now: Date): string | undefined {
  if (capacityNow(now).left === 0) return undefined;
  return fillIn(getCopy(locale).docs.offer.capacity.quoteBonus, months(locale, now));
}

/** Servicio del dialogo de cotizacion segun el slug del catalogo. */
const QUOTE_SERVICE: Record<string, string> = { "landing-page": "landing", "pagina-web-multipagina": "multipagina", "crm-personalizado": "crm", "mantencion-web": "mantencion" };

/** Datos del paso 2 del cotizador: montos con IVA incluido en la moneda de la pagina. */
function quoteOffer(s: PlanService, p: Plan, locale: Locale, fx: FxRates): QuoteOffer {
  const c = getCopy(locale);
  const d = c.docs.service;
  const amt = (net: number) => planAmount(net, locale, fx).amount;
  // Cada monto lleva su precio con IVA y su neto, calculados del catalogo: el resumen los suma sin volver a estimar nada.
  const pair = (netClp: number) => {
    const b = breakdown(netClp, locale, fx);
    return { amount: b.total, net: b.net };
  };
  const options = (["m3", "m6", "y1"] as const).flatMap((id) => {
    const net = s.support[id];
    return net === null ? [] : [{ id, label: d.support.periods[id], ...pair(net) }];
  });
  return {
    currency: planAmount(p.priceClp, locale, fx).currency,
    plan: { name: p.name[locale], ...pair(p.priceClp), from: p.from },
    code: p.sourceCodeClp === undefined ? null : pair(p.sourceCodeClp),
    ...(quoteBonus(locale, new Date()) ? { bonus: quoteBonus(locale, new Date()) } : {}),
    support: options.length === 0 ? null : { options, monthly: s.support.monthly === null ? null : amt(s.support.monthly), benefits: c.docs.maintenance.covers.items, conditions: d.support.conditions },
  };
}

/** Contenido del dialogo "Ver mas": precio del plan, lo incluido, plazos, soporte, codigo fuente y datos del servicio. El desglose de IVA solo va en el cotizador y en los terminos. */
function planDetail(s: PlanService, p: Plan, locale: Locale, fx: FxRates): PlanDetail {
  const d = getCopy(locale).docs.service;
  const det = d.detail;
  const split = breakdown(p.priceClp, locale, fx);
  const fmt = (n: number) => formatAmount({ amount: n, currency: split.currency }, locale);
  const sections: DetailSection[] = [
    {
      heading: det.price.heading,
      emphasis: true,
      ...(p.from ? { text: det.price.fromNote } : {}),
      rows: [[det.price.total, fmt(split.total)]],
    },
    { heading: det.includes, marker: "check", items: p.includes.map((i) => i[locale]) },
    {
      heading: det.delivery.heading,
      text: det.delivery.note,
      rows: [[det.delivery.time, p.deliveryDays[locale]], [det.delivery.revisions, det.delivery.revisionsValue(p.revisions)], [det.delivery.support, d.support.included(p.supportMonths)]],
    },
    {
      heading: det.access.heading,
      text: det.access.text,
      marker: "check",
      items: [
        det.access.domain,
        det.access.hosting,
        ...(s.slug === "crm-personalizado" ? [] : [p.id === "basico" ? det.access.mailOne : det.access.mailMany]),
        ...(s.slug === "crm-personalizado" || p.includes.some((i) => /panel|base de datos/i.test(i.es)) ? [det.access.panel] : []),
        det.access.doc,
        det.access.free,
      ],
    },
  ];
  if (s.upfront) {
    sections.push({ heading: d.upfront.heading, text: s.upfront.includes[locale], rows: [[d.upfront.price, price(s.upfront.priceClp, locale, fx)], [d.upfront.duration, s.upfront.duration[locale]]] });
  }
  if (s.support.m3 === null) {
    sections.push({ heading: det.support.heading, text: d.support.quoteIntro });
  } else {
    const sup = supportRows(s, locale, fx);
    const monthly = s.support.monthly === null ? null : price(s.support.monthly, locale, fx);
    sections.push(
      { heading: det.support.heading, text: det.support.included(p.supportMonths), rows: sup.map(([label, value], i) => [label ?? "", i === 3 ? det.support.perMonth(value ?? "") : (value ?? "")] as [string, string]) },
      { heading: d.support.covers, marker: "check", collapsed: true, items: getCopy(locale).docs.maintenance.covers.items },
      { heading: d.support.conditionsHeading, collapsed: true, items: d.support.conditions },
      ...(monthly === null ? [] : [{ heading: d.support.monthlyHeading, collapsed: true, text: d.support.monthlyText(monthly) }]),
    );
  }
  sections.push({
    heading: det.code.heading,
    text: det.code.text,
    rows: [[det.code.price, p.sourceCodeClp === undefined ? d.compare.codeQuote : price(p.sourceCodeClp, locale, fx)]],
  });
  sections.push(
    { heading: det.project.ideal, collapsed: true, items: s.idealFor.map((i) => i[locale]) },
    { heading: det.project.process, collapsed: true, items: s.steps.map((st) => `${st.title[locale]}: ${st.text[locale]}`) },
    { heading: det.project.tech, collapsed: true, items: s.tech },
  );
  return {
    label: det.link.label,
    title: det.link.title(s.name[locale], p.name[locale]),
    heading: det.heading(s.name[locale], p.name[locale]),
    subtitle: det.subtitle,
    close: det.close,
    sections,
  };
}

function planItems(s: PlanService, locale: Locale, fx: FxRates): PlanItem[] {
  const d = getCopy(locale).docs.service;
  return s.plans.map((p) => ({
    name: p.name[locale],
    price: price(p.priceClp, locale, fx),
    priceNote: p.from ? d.plans.from : d.plans.fixed,
    audience: `${d.plans.delivery} ${p.deliveryDays[locale]}`,
    includes: p.includes.map((i) => i[locale]),
    timeframe: `${d.plans.revisions(p.revisions)}. ${d.plans.support(p.supportMonths)}`,
    ...(p.recommended ? { featured: true } : {}),
    href: CONTACT,
    ctaLabel: d.plans.quote(p.name[locale]),
    ctaTitle: d.plans.quoteTitle(s.name[locale], p.name[locale]),
    quote: { service: QUOTE_SERVICE[s.slug] ?? "otro", serviceName: s.name[locale], plan: p.name[locale], offer: quoteOffer(s, p, locale, fx) },
    detail: planDetail(s, p, locale, fx),
  }));
}

// Tabla de precios por periodo de soporte (null = a cotizar).
function supportRows(s: PlanService, locale: Locale, fx: FxRates): string[][] {
  const d = getCopy(locale).docs.service.support;
  const val = (n: number | null) => (n === null ? d.quote : price(n, locale, fx));
  return [
    [d.periods.m3, val(s.support.m3)],
    [d.periods.m6, val(s.support.m6)],
    [d.periods.y1, val(s.support.y1)],
    [d.periods.monthly, val(s.support.monthly)],
  ];
}

function maintenanceRows(locale: Locale, fx: FxRates, linked: boolean): string[][] {
  const quote = getCopy(locale).docs.maintenance.prices.quote;
  const money = (n: number | null) => (n === null ? quote : price(n, locale, fx));
  const linkTitle = getCopy(locale).docs.services.linkTitle;
  return getPlanServices().map((p) => [linked ? `[${p.name[locale]}|${linkTitle(p.name[locale])}](${svc(p.slug)})` : p.name[locale], money(p.support.m3), money(p.support.m6), money(p.support.y1), money(p.support.monthly)]);
}

function homeDoc(locale: Locale, fx: FxRates): Doc {
  const d = getCopy(locale).docs.home;
  const plans = getPlanServices();

  return {
    title: d.title,
    lead: d.lead,
    sections: [
      // Estilo firebase.google.com: columnas oscuras de servicios, panel con tarjetas y fila de iconos, y pasos con detalle.
      {
        id: "servicios",
        variant: "dark",
        bare: true,
        heading: d.services.heading,
        blocks: [
          {
            type: "columns",
            items: [
              [getServices().filter((s) => s.group === "web"), d.services.columns[0]],
              [getServices().filter((s) => s.group !== "web"), d.services.columns[1]],
            ].map(([list, col], n) => {
              const c = col as (typeof d.services.columns)[number];
              return {
                eyebrow: c.eyebrow,
                heading: c.heading,
                text: c.text,
                action: action(c.action, n === 0 ? "page:/services#landing-page" : "page:/services#crm-personalizado"),
                links: (list as Service[]).map((s) => ({
                  icon: s.icon,
                  label: s.name[locale],
                  meta: s.kind === "plans" ? `${d.services.from} ${price(cheapest(s).priceClp, locale, fx)}` : s.tagline[locale],
                  title: d.services.linkTitle(s.name[locale]),
                  href: svc(s.slug),
                })),
              };
            }),
          },
        ],
      },
      {
        id: "por-que-elegirnos",
        variant: "mist",
        bare: true,
        heading: d.why.heading,
        blocks: [
          { type: "feature", eyebrow: d.why.feature.eyebrow, heading: d.why.feature.heading, action: action(d.why.feature.action, "page:/services"), highlights: [d.why.items[0], d.why.items[2]].flatMap((i) => (i ? [{ icon: i.icon, label: i.title }] : [])) },
          { type: "iconrow", eyebrow: d.why.more.eyebrow, heading: d.why.more.heading, items: [d.why.items[1], d.why.items[3], d.why.items[4], d.why.items[5]].flatMap((i) => (i ? [{ icon: i.icon, label: i.title, text: i.text }] : [])) },
        ],
      },
      {
        id: "proceso",
        variant: "brand",
        align: "center",
        eyebrow: d.process.eyebrow,
        heading: d.process.heading,
        intro: d.process.intro,
        blocks: [{ type: "timeline", label: d.process.heading, items: d.process.steps.map((st, i) => ({ ...st, icon: PROCESS_ICONS[i] ?? "compass" })) }],
      },
      {
        id: "precios",
        variant: "soft",
        icon: "gauge",
        heading: d.pricing.heading,
        intro: d.pricing.intro,
        action: action(d.pricing.action, "page:/pricing"),
        blocks: [
          {
            type: "table",
            caption: d.pricing.caption,
            head: d.pricing.head,
            nowrap: [1, 2, 3],
            rows: plans.map((s) => [`[${s.name[locale]}|${d.services.linkTitle(s.name[locale])}](${svc(s.slug)})`, ...s.plans.map((p) => planPrice(p, locale, fx, d.pricing.from))]),
          },
        ],
      },
      guaranteesSection(locale, "web"),
      capacitySection(locale, new Date()),
      { id: "preguntas-frecuentes", icon: "chat", heading: d.faq.heading, intro: d.faq.intro, blocks: [{ type: "faq", items: getCopy(locale).faq.items }] },
    ],
    cta: cta(d.cta, wa(locale, (m) => m.general)),
  };
}

function servicesDoc(locale: Locale, fx: FxRates): Doc {
  const c = getCopy(locale);
  const d = c.docs.services;
  const m = c.docs.maintenance;
  // Cada servicio es una pestana: resumen, lo que recibe, planes con su boton de cotizar y enlace al detalle completo.
  const tab = (s: Service) => {
    const name = s.name[locale];
    const description = `${s.tagline[locale]}. ${s.summary[locale]}`;
    // Al elegir un servicio se ve primero su descripcion junto a lo que se recibe, y enseguida los planes con sus precios.
    const blocks: Block[] =
      s.kind === "plans"
        ? [
            { type: "overview", text: description, heading: d.receive, items: s.receive.map((r) => r[locale]), more: d.receiveMore, less: d.receiveLess },
            { type: "plans", items: planItems(s, locale, fx) },
            { type: "p", text: `**${c.docs.offer.guarantees.heading}**` },
            guaranteesBlock(locale, offerKind(s.slug)),
            capacityBlock(locale, new Date()),
          ]
        : [
            { type: "overview", text: description, heading: m.covers.heading, items: m.covers.items, more: d.receiveMore, less: d.receiveLess },
            { type: "table", caption: m.prices.caption, head: m.prices.head, nowrap: [1, 2, 3, 4], rows: maintenanceRows(locale, fx, false) },
          ];
    return { id: s.slug, label: name, title: d.tabs.title(name), icon: s.icon, blocks };
  };
  return {
    title: d.title,
    lead: d.lead,
    sections: [
      { id: "servicios", icon: "layers", heading: d.tabs.heading, intro: d.tabs.intro, blocks: [{ type: "tabs", label: d.tabs.label, items: getServices().map(tab) }] },
    ],
    cta: cta(d.cta, "page:/pricing"),
  };
}

export function serviceDoc(locale: Locale, s: Service, fx: FxRates): Doc {
  return s.kind === "plans" ? planServiceDoc(locale, s, fx) : maintenanceDoc(locale, s, fx);
}

function planServiceDoc(locale: Locale, s: PlanService, fx: FxRates): Doc {
  const c = getCopy(locale);
  const d = c.docs.service;
  const sup = d.support;
  const covers = c.docs.maintenance.covers;
  const compareHead = [d.compare.head, ...s.plans.map((p) => p.name[locale])];
  const compareRows = [
    [d.compare.price, ...s.plans.map((p) => planPrice(p, locale, fx, c.docs.home.pricing.from))],
    [d.compare.code, ...s.plans.map((p) => (p.sourceCodeClp === undefined ? d.compare.codeQuote : price(p.sourceCodeClp, locale, fx)))],
    ...s.compare.map((r) => [r.label[locale], ...r.cells.map((cell) => cellText(cell, locale))]),
  ];
  const supportQuote = s.support.m3 === null;

  const kind = offerKind(s.slug);
  const now = new Date();
  const sections: Doc["sections"] = [
    resultsSection(locale, kind),
    { id: "planes", icon: "rocket", tone: toneOf(s.group), heading: d.plans.heading, intro: d.plans.intro, blocks: [{ type: "plans", items: planItems(s, locale, fx) }] },
    guaranteesSection(locale, kind),
    capacitySection(locale, now),
  ];

  if (s.upfront) {
    sections.push({
      id: "levantamiento",
      icon: "compass",
      heading: d.upfront.heading,
      intro: s.upfront.includes[locale],
      blocks: [{ type: "dl", items: [{ term: d.upfront.price, desc: price(s.upfront.priceClp, locale, fx) }, { term: d.upfront.duration, desc: s.upfront.duration[locale] }] }],
    });
  }

  sections.push(
    {
      id: "soporte",
      icon: "wrench",
      heading: sup.heading,
      intro: sup.intro,
      blocks: [
        supportQuote ? { type: "p", text: sup.quoteIntro } : { type: "table", caption: sup.heading, head: sup.head, rows: supportRows(s, locale, fx) },
        { type: "p", text: `**${sup.covers}**` },
        { type: "ul", items: covers.items },
        { type: "note", text: sup.notIncluded },
      ],
    },
    {
      id: "comparar",
      icon: "scale",
      heading: d.compare.heading,
      blocks: [{ type: "table", caption: d.compare.caption(s.name[locale]), head: compareHead, rows: compareRows, nowrap: [1, 2, 3] }],
    },
    {
      id: "acerca",
      icon: "file",
      heading: d.about.heading,
      blocks: [...s.intro.map((p): Block => ({ type: "p", text: p[locale] })), { type: "p", text: `**${d.about.receive}**` }, { type: "ul", items: s.receive.map((r) => r[locale]) }],
    },
    { id: "ideal", icon: "users", heading: d.ideal.heading, blocks: [{ type: "ul", items: s.idealFor.map((i) => i[locale]) }] },
    { id: "proceso", icon: "compass", heading: d.process.heading, blocks: [{ type: "steps", items: s.steps.map((st) => ({ title: st.title[locale], text: st.text[locale] })) }] },
    { id: "tecnologias", icon: "code", heading: d.tech.heading, blocks: [{ type: "ul", items: s.tech }] },
    { id: "preguntas", icon: "chat", heading: d.faq.heading, blocks: [{ type: "faq", items: s.faq.map((f) => ({ q: f.q[locale], a: f.a[locale] })) }] },
  );

  return { title: s.name[locale], lead: `${s.tagline[locale]}. ${s.summary[locale]}`, sections, cta: cta(d.cta(s.name[locale]), whatsappLink(c.ui.whatsapp.service(s.name[locale]))) };
}

function maintenanceDoc(locale: Locale, s: SupportService, fx: FxRates): Doc {
  const c = getCopy(locale);
  const d = c.docs.maintenance;
  return {
    title: d.title,
    lead: `${s.tagline[locale]}. ${d.lead}`,
    sections: [
      { id: "cubre", icon: "wrench", tone: toneOf(s.group), heading: d.covers.heading, blocks: [{ type: "ul", items: d.covers.items }, { type: "note", text: d.covers.note }] },
      {
        id: "precios",
        icon: "gauge",
        heading: d.prices.heading,
        intro: d.prices.intro,
        blocks: [{ type: "table", caption: d.prices.caption, head: d.prices.head, nowrap: [1, 2, 3, 4], rows: maintenanceRows(locale, fx, true) }, { type: "note", text: d.prices.crmNote }],
      },
      { id: "como-funciona", icon: "file", heading: d.how.heading, blocks: [{ type: "ul", items: d.how.items }] },
      { id: "preguntas", icon: "chat", heading: c.docs.service.faq.heading, blocks: [{ type: "faq", items: [c.faq.items[3] as { q: string; a: string }] }] },
    ],
    cta: cta(d.cta, wa(locale, (m) => m.maintenance)),
  };
}

function pricingDoc(locale: Locale, fx: FxRates): Doc {
  const c = getCopy(locale);
  const d = c.docs.pricing;
  const faq = c.faq.items;
  return {
    title: d.title,
    lead: d.lead,
    sections: [
      {
        id: "precios-por-servicio",
        icon: "gauge",
        heading: d.tabs.heading,
        intro: d.tabs.intro,
        blocks: [
          {
            type: "tabs",
            label: d.tabs.label,
            items: [
              ...getPlanServices().map((s) => ({
                id: s.slug,
                label: s.name[locale],
                title: c.docs.services.tabs.title(s.name[locale]),
                icon: s.icon,
                blocks: [
                  { type: "p", text: `${s.tagline[locale]}. ${d.plans.intro}` },
                  { type: "plans", items: planItems(s, locale, fx) },
                ] satisfies Block[],
              })),
              {
                id: "mantencion-web",
                label: d.maintenance.heading,
                title: c.docs.services.tabs.title(d.maintenance.heading),
                icon: "wrench" as const,
                blocks: [
                  { type: "p", text: d.maintenance.intro },
                  { type: "table", caption: c.docs.maintenance.prices.caption, head: c.docs.maintenance.prices.head, nowrap: [1, 2, 3, 4], rows: maintenanceRows(locale, fx, false) },
                  { type: "p", text: `[${d.maintenance.link}|${d.maintenance.linkTitle}](service:mantencion-web)` },
                ] satisfies Block[],
              },
            ],
          },
        ],
      },
      guaranteesSection(locale, "web"),
      capacitySection(locale, new Date()),
      { id: "preguntas", icon: "chat", heading: d.faq.heading, blocks: [{ type: "faq", items: [faq[1], faq[3], faq[7]].filter((x): x is { q: string; a: string } => Boolean(x)) }] },
    ],
    cta: cta(d.cta, wa(locale, (m) => m.pricing)),
  };
}

function projectsDoc(locale: Locale): Doc {
  const d = getCopy(locale).docs.projects;
  return {
    title: d.title,
    lead: d.lead,
    sections: [
      {
        id: "proyectos",
        icon: "rocket",
        heading: d.heading,
        intro: d.intro,
        blocks: [
          {
            type: "projects",
            filters: d.filters,
            items: getProjects().map((p) => ({
              slug: p.slug,
              status: p.status,
              statusLabel: d.status[p.status],
              title: p.title[locale],
              description: p.description[locale],
              url: p.url,
              host: new URL(p.url).hostname.replace(/^www\./, ""),
              date: formatDate(p.publishedAt, locale, "long"),
              dateIso: p.publishedAt,
              cover: p.cover,
              coverAlt: p.coverAlt[locale],
              coverTitle: getCopy(locale).brand.imageTitles.cover(p.title[locale]),
              tags: p.tags.map((t) => t[locale]),
              linkLabel: d.link.label,
              linkTitle: d.link.title(p.title[locale]),
            })),
          },
        ],
      },
    ],
    cta: cta(d.cta, "page:/services"),
  };
}

function faqDoc(locale: Locale): Doc {
  const c = getCopy(locale);
  const d = c.docs.faq;
  return {
    title: d.title,
    lead: d.lead,
    sections: d.groups.map((g) => ({
      id: g.id,
      icon: g.icon,
      heading: g.heading,
      intro: g.intro,
      blocks: [{ type: "faq", items: g.items.map((i) => c.faq.items[i]).filter((x): x is { q: string; a: string } => Boolean(x)) }] satisfies Block[],
    })),
    cta: cta(d.cta, wa(locale, (m) => m.faq)),
  };
}

function aboutDoc(locale: Locale): Doc {
  const c = getCopy(locale);
  const d = c.docs.about;
  const home = c.docs.home;
  return {
    title: d.title,
    lead: d.lead,
    sections: [
      // Una persona real: panel gris claro con el texto de presentacion.
      { id: "con-quien", variant: "mist", icon: "users", heading: d.who.heading, blocks: [{ type: "p", text: d.who.text }] },
      // Compromisos en tarjetas con icono, en vez de una lista de definiciones.
      {
        id: "como-trabajamos",
        icon: "badge",
        heading: d.commitments.heading,
        blocks: [{ type: "cards", cols: 3, items: d.commitments.items.map((it, i) => ({ icon: COMMITMENT_ICONS[i] ?? "badge", title: it.term, text: it.desc })) }],
      },
      // Mismo proceso del inicio: tres pasos numerados a la vista, centrados en un panel azul.
      {
        id: "proceso",
        variant: "brand",
        align: "center",
        eyebrow: home.process.eyebrow,
        heading: home.process.heading,
        intro: home.process.intro,
        blocks: [{ type: "timeline", label: home.process.heading, items: home.process.steps.map((st, i) => ({ ...st, icon: PROCESS_ICONS[i] ?? "compass" })) }],
      },
    ],
    cta: cta(d.cta, wa(locale, (m) => m.general)),
  };
}

function contactDoc(locale: Locale): Doc {
  const d = getCopy(locale).docs.contact;
  return {
    title: d.title,
    lead: d.lead,
    sections: [
      { id: "formulario", icon: "mail", heading: d.form.heading, blocks: [] },
      {
        id: "datos",
        icon: "phone",
        heading: d.data.heading,
        blocks: [
          {
            type: "dl",
            items: [
              { term: d.data.whatsapp, desc: `[${COMPANY.phone}|${d.data.whatsappTitle}](${wa(locale, (m) => m.contact)})` },
              { term: d.data.email, desc: `[${COMPANY.email}|${d.data.emailTitle}](mailto:${COMPANY.email})` },
              { term: d.data.hours, desc: COMPANY.hours[locale] },
            ],
          },
        ],
      },
      { id: "despues", icon: "clock", heading: d.next.heading, blocks: [{ type: "steps", items: d.next.steps }] },
    ],
  };
}

/**
 * Montos que citan los textos legales, calculados desde el catalogo (nunca escritos a mano): si cambia un precio, el texto cambia
 * solo. En pesos tambien en ingles, porque el cobro y el documento tributario son en pesos.
 */
function legalAmounts(locale: Locale): Record<string, string> {
  const upfront = getPlanServices().find((s) => s.upfront)?.upfront;
  return { "{crmUpfront}": upfront ? formatClp(withIva(upfront.priceClp), locale) : "" };
}

/** Reemplaza las marcas {nombre} del documento por su valor (el Doc es JSON plano: texto, listas y tablas). */
function fill(doc: Doc, values: Record<string, string>): Doc {
  return JSON.parse(Object.entries(values).reduce((s, [mark, value]) => s.replaceAll(mark, value), JSON.stringify(doc))) as Doc;
}

export function getPageDoc(locale: Locale, key: PageKey, fx: FxRates): Doc {
  const c = getCopy(locale).docs;
  switch (key) {
    case "home": return homeDoc(locale, fx);
    case "services": return servicesDoc(locale, fx);
    case "pricing": return pricingDoc(locale, fx);
    case "projects": return projectsDoc(locale);
    case "faq": return faqDoc(locale);
    case "about": return aboutDoc(locale);
    case "contact": return contactDoc(locale);
    case "privacy": return c.privacy;
    case "terms": return fill(c.terms, legalAmounts(locale));
    case "cookies": return c.cookies;
  }
}

export const PAGE_KEYS = Object.keys(PAGE_PATHNAME) as PageKey[];
