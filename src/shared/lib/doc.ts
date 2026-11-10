import type { AppPathname } from "@/i18n/routing";
import type { IconName } from "@/shared/constants/icons";

/**
 * Modelo de documento: una pagina es un arbol de secciones y bloques. El mismo dato alimenta
 * el HTML renderizado, la version en texto plano (/raw).
 *
 * Sintaxis inline en strings:
 *   [texto|title](destino)   enlace; destino = page:/ruta | service:slug | https://... | mailto: | tel:
 *   **negrita**   `codigo`
 */
export type Tone = "blue" | "orange" | "green";

export type CardLink = { label: string; title: string; href: string; icon?: IconName };

export type CardItem = {
  icon?: IconName;
  tone?: Tone;
  /** Lista de enlaces con icono dentro de la tarjeta (estilo listado de productos de Google). */
  links?: CardLink[];
  title: string;
  text: string;
  /** Destino con la sintaxis de enlaces (page:/ruta, service:slug). */
  href?: string;
  linkLabel?: string;
  /** Descripcion del destino, distinta del texto visible. */
  linkTitle?: string;
  meta?: string;
  /** Etiqueta destacada en la esquina de la tarjeta (por ejemplo, "Popular"). */
  badge?: string;
};

/** Seccion del dialogo "Ver mas": titulo, texto, lista y/o filas rotulo-valor (todo ya en el idioma de la pagina). */
export type DetailSection = {
  heading: string;
  text?: string;
  items?: string[];
  rows?: [string, string][];
  /** Lista con palomitas (lo incluido, beneficios) en vez de vinetas. */
  marker?: "check";
  /** Panel destacado: la ultima fila (el total) va en grande. */
  emphasis?: boolean;
  /** Se muestra plegada y el cliente la abre; las demas van abiertas. */
  collapsed?: boolean;
};

/** Detalle completo de un plan para el dialogo "Ver mas" (y para el Markdown). */
export type PlanDetail = {
  label: string;
  title: string;
  heading: string;
  subtitle: string;
  close: { label: string; title: string };
  sections: DetailSection[];
};

/**
 * Datos del paso 2 del cotizador, en la moneda de la pagina. `amount` es el precio con IVA y `net` su neto; el cliente suma
 * ambos (el IVA es la diferencia), asi el desglose siempre cuadra con las lineas. Si falta `support` o `code`, esa opcion no se
 * ofrece (por ejemplo, el CRM se cotiza aparte).
 */
export type QuoteOffer = {
  currency: "CLP" | "USD";
  plan: { name: string; amount: number; net: number; from: boolean };
  /** Bono por confirmar dentro del mes (solo mientras quedan cupos), ya redactado. */
  bonus?: string;
  code: { amount: number; net: number } | null;
  support: {
    options: { id: "m3" | "m6" | "y1"; label: string; amount: number; net: number }[];
    monthly: number | null;
    benefits: string[];
    conditions: string[];
  } | null;
};

export type PlanItem = {
  name: string;
  price: string;
  priceNote: string;
  audience: string;
  includes: string[];
  timeframe: string;
  featured?: boolean;
  href: string;
  ctaLabel: string;
  ctaTitle: string;
  /** Si existe, el boton abre el dialogo de cotizacion en vez de ir a la pagina de contacto. */
  quote?: { service: string; serviceName: string; plan: string; offer?: QuoteOffer };
  /** Si existe, se muestra el enlace centrado "Ver mas" que abre el detalle completo del plan. */
  detail?: PlanDetail;
};

/** Pestana de un bloque `tabs`: su contenido es una lista de bloques (renderizada en servidor). */
export type TabBlockItem = { id: string; label: string; title: string; icon?: IconName; blocks: Block[] };

/** Tarjeta de proyecto lista para mostrar (textos ya en el idioma de la pagina). */
export type ProjectCardItem = {
  slug: string;
  status: "production" | "demo";
  statusLabel: string;
  title: string;
  description: string;
  url: string;
  host: string;
  /** Fecha formateada para mostrar y su version ISO para <time>. */
  date: string;
  dateIso: string;
  cover: string;
  coverAlt: string;
  coverTitle: string;
  tags: string[];
  linkLabel: string;
  linkTitle: string;
};

export type ProjectFilters = { label: string; all: string; production: string; demo: string; shown: string };

export type Block =
  | { type: "p"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "table"; caption: string; head: string[]; rows: string[][]; nowrap?: number[] }
  | { type: "note"; text: string }
  | { type: "dl"; items: { term: string; desc: string }[] }
  | { type: "cards"; cols?: 2 | 3; items: CardItem[] }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "plans"; items: PlanItem[] }
  | { type: "faq"; items: { q: string; a: string }[] }
  /**
   * Cupos del mes (escasez real, ver shared/constants/offer.ts): barra con los cupos tomados y libres, estado, bono por confirmar
   * dentro del mes y boton para reservar. `meter` describe la barra para lectores de pantalla.
   */
  | { type: "capacity"; heading: string; status: string; text: string; total: number; taken: number; meter: string; bonus?: string; action: DocAction }
  /**
   * Resumen de un servicio al estilo Google: la descripcion a la izquierda y, a la derecha, una tarjeta con lo que se recibe (lista con
   * palomitas). Muestra los primeros y el resto se despliega con "Ver N mas" (more con {n}) y "Ver menos" (less), para llegar rapido a los planes.
   */
  | { type: "overview"; text: string; heading: string; items: string[]; more: string; less: string }
  | { type: "tabs"; label: string; items: TabBlockItem[] }
  /** Listado de proyectos del portafolio en tarjetas con filtros por estado. */
  | { type: "projects"; filters: ProjectFilters; items: ProjectCardItem[] }
  /** Columnas oscuras estilo Firebase (Compilar / Ejecutar): sobretitulo, titular, texto, lista de enlaces con icono y boton. */
  | { type: "columns"; items: ColumnItem[] }
  /** Showcase claro: panel degradado con tarjetas de vidrio a la izquierda; sobretitulo, titular y boton a la derecha. */
  | { type: "feature"; eyebrow: string; heading: string; action: DocAction; highlights: { icon: IconName; label: string }[] }
  /** Fila centrada de iconos con rotulo (estilo "integraciones"): sobretitulo, titular y lista. */
  | { type: "iconrow"; eyebrow: string; heading: string; items: { icon: IconName; tone?: Tone; label: string; text: string }[] }
  /** Linea de tiempo de pasos: todos a la vista, numerados y unidos por una linea, con la primera frase como descripcion y el resto como viñetas. Para fondo oscuro o azul. */
  | { type: "timeline"; label: string; items: { title: string; text: string; icon: IconName }[] };

export type ColumnLink = { icon: IconName; label: string; meta?: string; title: string; href: string };
export type ColumnItem = { eyebrow: string; heading: string; text: string; links: ColumnLink[]; action: DocAction };

export type DocAction = { label: string; title: string; href: string };

export type DocSection = {
  id: string;
  heading: string;
  blocks: Block[];
  /** Icono en circulo junto al titulo de la seccion. */
  icon?: IconName;
  tone?: Tone;
  /** Texto breve bajo el titulo. */
  intro?: string;
  /** Boton secundario a la derecha del titulo ("Ver mas"). */
  action?: DocAction;
  /**
   * Fondo de la seccion, todos con la "A" de la marca como forma decorativa: dark = grises oscuros con resplandor azul; brand =
   * azul primario; soft = tinte azul claro; mist = gris claro. Sin variante: la seccion va plana sobre el fondo de la pagina.
   */
  variant?: "dark" | "brand" | "soft" | "mist";
  /** center: titular, sobretitulo e introduccion centrados (paneles oscuros y azules). */
  align?: "center";
  /** Sin cabecera visible: los bloques traen sus propios titulares. El heading queda como nombre accesible. */
  bare?: boolean;
  /** Sobretitulo en mayusculas y fuente monoespaciada sobre el titular. */
  eyebrow?: string;
};

export type DocCta = { title: string; text: string; primary: DocAction; secondary?: DocAction };

export type Doc = {
  title: string;
  lead: string;
  sections: DocSection[];
  /** Banda final de llamada a la accion. */
  cta?: DocCta;
};

export type PageKey =
  | "home"
  | "services"
  | "projects"
  | "pricing"
  | "faq"
  | "about"
  | "contact"
  | "privacy"
  | "terms"
  | "cookies";

export const PAGE_PATHNAME: Record<PageKey, AppPathname> = {
  home: "/",
  services: "/services",
  projects: "/projects",
  pricing: "/pricing",
  faq: "/faq",
  about: "/about",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/terms",
  cookies: "/cookies",
};
