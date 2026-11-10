import type { Locale } from "@/i18n/routing";

const INTL_LOCALE: Record<Locale, string> = { es: "es-CL", en: "en-US" };

export function formatClp(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUf(amount: number, locale: Locale): string {
  const n = new Intl.NumberFormat(INTL_LOCALE[locale], { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return `${n} UF`;
}

/** Las fechas del contenido son ISO sin hora: se formatean en UTC para evitar corrimientos de dia. */
export function formatDate(iso: string, locale: Locale, style: "long" | "medium" = "long"): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: style, timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(n);
}
