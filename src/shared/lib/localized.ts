import { z } from "@/shared/lib/z";
import { routing, type Locale } from "@/i18n/routing";

export const localized = <T extends z.ZodType>(inner: T) => z.object({ es: inner, en: inner });

export type Localized<T> = Record<Locale, T>;

export const pick = <T>(value: Localized<T>, locale: Locale): T => value[locale];

export const LOCALES = routing.locales;
