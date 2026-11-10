import type { QuoteOffer } from "@/shared/lib/doc";

/** Opciones que el cliente marca en el paso 2: periodo de soporte adicional (o ninguno) y compra del codigo fuente. */
export type QuoteChoice = { support: "m3" | "m6" | "y1" | null; code: boolean };

export type QuoteItem = { key: "plan" | "support" | "code"; label: string; amount: number; net: number };

/**
 * Lineas y total de la cotizacion. Cada linea trae su precio con IVA y su neto (del catalogo); el total es la suma de las lineas,
 * el neto la suma de los netos y el IVA la diferencia. Nada se recalcula hacia atras: lo que se ve en las lineas es lo que suma.
 */
export function quoteSummary(offer: QuoteOffer, choice: QuoteChoice, labels: { plan: string; support: string; code: string }) {
  const items: QuoteItem[] = [{ key: "plan", label: `${labels.plan}: ${offer.plan.name}`, amount: offer.plan.amount, net: offer.plan.net }];
  const option = choice.support ? offer.support?.options.find((o) => o.id === choice.support) : undefined;
  if (option) items.push({ key: "support", label: `${labels.support}: ${option.label}`, amount: option.amount, net: option.net });
  if (choice.code && offer.code) items.push({ key: "code", label: labels.code, amount: offer.code.amount, net: offer.code.net });
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  const net = items.reduce((sum, i) => sum + i.net, 0);
  return { items, net, iva: total - net, total };
}
