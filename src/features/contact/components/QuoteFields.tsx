"use client";

import { ExternalLink } from "lucide-react";
import { useRef, useState, type RefObject } from "react";
import type { Locale } from "@/i18n/routing";
import ErrorIcon from "@/shared/components/core/ErrorIcon";
import Field from "@/shared/components/core/Field";
import SelectField from "@/shared/components/core/SelectField";
import { cn } from "@/shared/lib/cn";
import { keepDigits } from "@/shared/lib/digits";
import { validateQuote } from "../quote-message";
import { LIMITS, SERVICE_OPTIONS, type QuoteField, type QuoteValues } from "../state";
import { controlClass } from "./controls";
import CountryField from "./CountryField";

/** Textos de los campos compartidos por el dialogo de cotizacion y el formulario de contacto. */
export type FieldsCopy = {
  name: { label: string; max: string };
  phone: { label: string; country: string; empty: string };
  service: { label: string; placeholder: string };
  services: Record<(typeof SERVICE_OPTIONS)[number], string>;
  message: { label: string };
  consent: { before: string; terms: string; middle: string; privacy: string; after: string; newTab: string; termsTitle: string; privacyTitle: string; note: string };
  errors: Record<QuoteField, string>;
};

/** Lee los valores actuales del formulario; `override` reemplaza los que cambian sin generar un evento del DOM (prefijo y servicio). */
export const readValues = (form: HTMLFormElement, override: Partial<QuoteValues> = {}): QuoteValues => {
  const fd = new FormData(form);
  const text = (k: string) => (typeof fd.get(k) === "string" ? String(fd.get(k)) : "");
  return {
    name: text("name"),
    phoneCountry: override.phoneCountry ?? text("phoneCountry"),
    phone: text("phone"),
    service: override.service ?? text("service"),
    message: text("message"),
    consent: fd.get("consent") === "on",
  };
};

/** Abre una URL como lo haria un enlace (mailto: lo resuelve el sistema con la app de correo elegida; WhatsApp va en otra pestana). */
export function openLink(href: string, newTab: boolean) {
  const a = document.createElement("a");
  a.href = href;
  if (newTab) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  document.body.append(a);
  a.click();
  a.remove();
}

/**
 * Al salir de un campo solo se marca como tocado si la persona escribio algo (o marco la casilla). Un campo obligatorio que
 * apenas se recorre vacio no muestra su error hasta enviar: asi el error no aparece de golpe, no empuja el formulario y el
 * clic que la persona estaba haciendo en el campo siguiente no se pierde.
 */
export const leftWithValue = (target: EventTarget) => {
  const el = target as HTMLInputElement;
  return el.type === "checkbox" ? el.checked : (el.value ?? "").trim() !== "";
};

/**
 * Validacion en tiempo real: cada campo que la persona ya toco (escribio o dejo) muestra su error en cuanto no cumple y lo
 * quita en cuanto cumple. `sync` reevalua (con `touch` marca un campo); `validateAll` marca todos como tocados, muestra los
 * errores y enfoca el primero; devuelve los valores solo si todo cumple. Se valida SIEMPRE antes de enviar.
 */
export function useLiveValidation(formRef: RefObject<HTMLFormElement | null>) {
  const [shown, setShown] = useState<Set<QuoteField>>(new Set());
  const touched = useRef(new Set<QuoteField>());

  const sync = (override: Partial<QuoteValues> = {}, touch?: QuoteField) => {
    if (!formRef.current) return;
    if (touch) touched.current.add(touch);
    const invalid = new Set(validateQuote(readValues(formRef.current, override)));
    const next = new Set([...touched.current].filter((f) => invalid.has(f)));
    setShown((prev) => (prev.size === next.size && [...next].every((f) => prev.has(f)) ? prev : next));
  };

  const fieldOf = (target: EventTarget): QuoteField | null => {
    const n = (target as HTMLInputElement).name;
    return n === "name" || n === "phone" || n === "message" || n === "consent" ? n : null;
  };

  const validateAll = (): QuoteValues | null => {
    if (!formRef.current) return null;
    const values = readValues(formRef.current);
    const errors = validateQuote(values);
    for (const f of ["name", "phone", "service", "message", "consent"] as const) touched.current.add(f);
    setShown(new Set(errors));
    if (errors.length > 0) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return null;
    }
    return values;
  };

  return { shown, sync, fieldOf, validateAll };
}

type Props = {
  uid: string;
  locale: Locale;
  copy: FieldsCopy;
  privacyHref: string;
  termsHref: string;
  /** Servicio preseleccionado. */
  defaultService: string;
  shown: Set<QuoteField>;
  sync: ReturnType<typeof useLiveValidation>["sync"];
  autoFocus?: boolean;
};

/**
 * Los campos del formulario (nombre, telefono con prefijo, servicio, proyecto) y la casilla de consentimiento, en el mismo
 * formato estilo Google en el dialogo de cotizacion y en la pagina de contacto. Los eventos de cambio y de salida los
 * recoge el <form> que los contiene (ver `useLiveValidation`).
 */
export default function QuoteFields({ uid, locale, copy, privacyHref, termsHref, defaultService, shown, sync, autoFocus }: Props) {
  // Largo del nombre: si supera el maximo, el error lo dice explicitamente (en vez del mensaje general del campo).
  const [nameLength, setNameLength] = useState(0);
  const err = (f: QuoteField) => {
    if (!shown.has(f)) return undefined;
    if (f === "name" && nameLength > LIMITS.nameMax) return copy.name.max.replace("{max}", String(LIMITS.nameMax));
    return copy.errors[f];
  };
  return (
    <>
      <Field id={`${uid}-name`} label={copy.name.label} error={err("name")} required>
        {(a11y) => (
          <input
            {...a11y}
            name="name"
            type="text"
            autoComplete="name"
            required
            autoFocus={autoFocus}
            onInput={(e) => setNameLength(e.currentTarget.value.trim().length)}
            className={controlClass}
          />
        )}
      </Field>

      <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
        <CountryField id={`${uid}-country`} name="phoneCountry" label={copy.phone.country} empty={copy.phone.empty} locale={locale} defaultValue="+56" onChange={(code) => sync({ phoneCountry: code })} />
        <Field id={`${uid}-phone`} label={copy.phone.label} error={err("phone")} required>
          {(a11y) => <input {...a11y} name="phone" type="tel" inputMode="numeric" pattern="[0-9]*" onInput={keepDigits} autoComplete="tel-national" required className={controlClass} />}
        </Field>
      </div>

      <SelectField
        id={`${uid}-service`}
        name="service"
        label={copy.service.label}
        error={err("service")}
        required
        placeholder={copy.service.placeholder}
        options={SERVICE_OPTIONS.map((v) => ({ value: v, label: copy.services[v] }))}
        defaultValue={defaultService}
        onChange={(v) => sync({ service: v }, "service")}
      />

      <Field id={`${uid}-message`} label={copy.message.label} error={err("message")} required>
        {(a11y) => <textarea {...a11y} name="message" rows={3} required maxLength={LIMITS.messageMax} className={cn(controlClass, "resize-y")} />}
      </Field>

      {/* Consentimiento expreso (Ley 21.719): casilla obligatoria, con los dos documentos en una pestana nueva. */}
      <div className="grid gap-2">
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3.5 rounded-[14px] border border-line-strong px-3 py-3 transition-colors duration-(--duration-enter) sm:px-4",
            "has-[input:checked]:border-blue has-[input:checked]:bg-blue-soft/40 has-[input:checked]:ring-1 has-[input:checked]:ring-blue",
            "has-[input[aria-invalid=true]]:border-del has-[input[aria-invalid=true]]:ring-1 has-[input[aria-invalid=true]]:ring-del",
          )}
        >
          <input
            type="checkbox"
            name="consent"
            required
            aria-invalid={shown.has("consent") ? true : undefined}
            aria-describedby={shown.has("consent") ? `${uid}-consent-error` : undefined}
            className="md-check mt-0.5"
          />
          <span className="text-sm leading-relaxed">
            {copy.consent.before}
            <a href={termsHref} target="_blank" rel="noopener noreferrer" title={copy.consent.termsTitle} className="font-medium text-blue underline underline-offset-4">
              {copy.consent.terms}
              <span className="sr-only"> {copy.consent.newTab}</span>
              <ExternalLink aria-hidden="true" size={13} className="ml-1 inline align-baseline" />
            </a>
            {copy.consent.middle}
            <a href={privacyHref} target="_blank" rel="noopener noreferrer" title={copy.consent.privacyTitle} className="font-medium text-blue underline underline-offset-4">
              {copy.consent.privacy}
              <span className="sr-only"> {copy.consent.newTab}</span>
              <ExternalLink aria-hidden="true" size={13} className="ml-1 inline align-baseline" />
            </a>
            {copy.consent.after}
          </span>
        </label>
        {err("consent") ? (
          <p id={`${uid}-consent-error`} className="flex items-start gap-2 px-1 text-xs font-medium text-del">
            <ErrorIcon size={16} className="mt-px" />
            <span>{err("consent")}</span>
          </p>
        ) : null}
        <p className="px-1 text-xs leading-relaxed text-ink-soft">{copy.consent.note}</p>
      </div>
    </>
  );
}
