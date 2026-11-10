import type { IconName } from "./icons";

export type ServiceGroup = "web" | "apps" | "care";

/** Orden, icono y color de cada linea de servicios. El color orienta al usuario en tarjetas, menu y secciones. */
export const GROUPS: { id: ServiceGroup; icon: IconName; tone: "blue" | "orange" | "green" }[] = [
  { id: "web", icon: "globe", tone: "blue" },
  { id: "apps", icon: "layers", tone: "orange" },
  { id: "care", icon: "wrench", tone: "green" },
];

export const toneOf = (group: ServiceGroup) => GROUPS.find((g) => g.id === group)?.tone ?? "blue";
