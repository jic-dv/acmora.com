import type { FormEvent } from "react";

/** Deja solo los digitos 0-9 (sin espacios, signos ni letras). */
export const onlyDigits = (value: string) => value.replace(/\D/g, "");

/** Largo maximo de un telefono sin prefijo de pais. Se aplica despues de limpiar: un `maxLength` recortaria el texto con espacios o guiones antes de filtrarlo. */
export const PHONE_MAX = 12;

/**
 * onInput de un campo de telefono sin prefijo de pais: quita al instante todo lo que no sea un digito (teclado, pegado
 * o autocompletado), corta a `PHONE_MAX` y mantiene el cursor donde estaba, descontando los caracteres eliminados antes de el.
 */
export function keepDigits(e: FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  const clean = onlyDigits(el.value).slice(0, PHONE_MAX);
  if (clean === el.value) return;
  const caret = Math.min(onlyDigits(el.value.slice(0, el.selectionStart ?? el.value.length)).length, clean.length);
  el.value = clean;
  el.setSelectionRange(caret, caret);
}
