import type { Locale } from "@/i18n/routing";
import { formatClp } from "./format";

/** Tipo de cambio de referencia. `live` es false cuando no se pudo consultar ninguna fuente y se usan valores aproximados. */
export type FxRates = { usdClp: number; ufClp: number; date: string; live: boolean };

export const FALLBACK_FX: FxRates = { usdClp: 980, ufClp: 41000, date: "2026-11-04", live: false };

/** IVA de Chile (SII): 19%. */
export const IVA_PERCENT = 19;

/**
 * IVA de un neto en pesos, al peso. Los precios del catalogo son NETOS (lo que Acmora conserva) y estan en centenas, asi que el
 * IVA sale exacto, sin redondeo: 220.000 -> 41.800. Nada se agrega ni se quita: no hay pesos "fantasma".
 */
export const ivaOf = (net: number) => Math.round((net * IVA_PERCENT) / 100);

/** Precio al publico: neto + IVA exacto (220.000 -> 261.800; 54.900 -> 65.331). */
export const withIva = (net: number) => net + ivaOf(net);

export type Currency = "CLP" | "USD";
export type Amount = { amount: number; currency: Currency };
/** Desglose de un precio en la moneda de la pagina: neto, IVA y total, que siempre cuadran (neto + IVA = total). */
export type Breakdown = { net: number; iva: number; total: number; currency: Currency };

/** Conversion a dolares al cambio vigente, al dolar entero (referencial; el cobro es en pesos). */
const toUsd = (clp: number, fx: FxRates) => Math.round(clp / fx.usdClp);

/**
 * Desglose a partir del neto en CLP. En espanol, pesos exactos. En ingles, total y neto se convierten por separado y el IVA es la
 * diferencia, para que la suma de lineas y el total de una cotizacion cuadren siempre.
 */
export function breakdown(netClp: number, locale: Locale, fx: FxRates): Breakdown {
  const total = withIva(netClp);
  if (locale === "es") return { net: netClp, iva: total - netClp, total, currency: "CLP" };
  const usdTotal = toUsd(total, fx);
  const usdNet = toUsd(netClp, fx);
  return { net: usdNet, iva: usdTotal - usdNet, total: usdTotal, currency: "USD" };
}

/** Precio al publico con IVA incluido a partir del neto en CLP: pesos en espanol, dolares al cambio vigente en ingles. */
export function planAmount(netClp: number, locale: Locale, fx: FxRates): Amount {
  const b = breakdown(netClp, locale, fx);
  return { amount: b.total, currency: b.currency };
}

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/** Da formato a un monto ya calculado (con IVA) en su moneda y el idioma de la pagina. */
export function formatAmount(a: Amount, locale: Locale): string {
  return a.currency === "CLP" ? formatClp(a.amount, locale) : usd(a.amount);
}

export function formatPlanPrice(netClp: number, locale: Locale, fx: FxRates): string {
  return formatAmount(planAmount(netClp, locale, fx), locale);
}
