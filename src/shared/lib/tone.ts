import type { Tone } from "./doc";

/** Clases del circulo de icono por color de linea. Literales completos para que Tailwind los detecte. */
export const TONE_CLASS: Record<Tone, string> = {
  blue: "bg-blue-soft text-blue",
  orange: "bg-orange-soft text-orange-deep",
  green: "bg-green-soft text-add",
};
