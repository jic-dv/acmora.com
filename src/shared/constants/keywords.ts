import type { Locale } from "@/i18n/routing";

/**
 * Palabras clave del sitio: como busca un cliente que necesita desarrollo para su empresa (en Google y en buscadores con IA).
 * Se usan en la etiqueta keywords de cada pagina, en `knowsAbout` de los datos estructurados y en llms.txt. Los titulos y las
 * descripciones se escriben aparte, en lenguaje natural, con las mas importantes de estas.
 */
type Group = "brand" | "general" | "landing" | "multipagina" | "crm" | "maintenance" | "pricing" | "contact" | "about" | "faq";

export const KEYWORDS: Record<Locale, Record<Group, string[]>> = {
  es: {
    brand: ["Acmora", "Acmora desarrollo web", "Acmora software", "Acmora agencia de desarrollo"],
    general: [
      "agencia de desarrollo de software",
      "empresa de desarrollo de software",
      "desarrollo de software a medida",
      "servicios de desarrollo de software",
      "desarrollo web",
      "servicios de desarrollo web",
      "desarrollo de páginas web",
      "servicios de páginas web",
      "diseño de páginas web",
      "diseño web profesional",
      "creación de páginas web",
      "páginas web para empresas",
      "páginas web para pymes",
      "páginas web para emprendedores",
      "desarrollo de aplicaciones web",
      "landing pages",
      "CRM para empresas",
      "CRM personalizado",
      "mantención web",
    ],
    landing: [
      "landing page",
      "landing pages",
      "desarrollo de landing pages",
      "diseño de landing page",
      "landing page para empresas",
      "landing page para campañas",
      "página de aterrizaje",
      "landing page con WhatsApp",
      "precio landing page",
    ],
    multipagina: [
      "página web corporativa",
      "sitio web corporativo",
      "desarrollo de sitios web",
      "página web para empresas",
      "sitio web con blog",
      "página web autoadministrable",
      "desarrollo de páginas web profesionales",
      "precio página web",
    ],
    crm: [
      "CRM personalizado",
      "CRM a medida",
      "desarrollo de CRM",
      "CRMs para empresas",
      "software CRM para pymes",
      "sistema de gestión de clientes",
      "software de gestión a medida",
      "CRM para ventas",
      "desarrollo de software empresarial",
    ],
    maintenance: [
      "mantención web",
      "mantenimiento de páginas web",
      "soporte web",
      "soporte técnico web",
      "actualizaciones de seguridad web",
      "respaldos de sitios web",
      "mantenimiento web mensual",
    ],
    pricing: ["precio página web", "cuánto cuesta una página web", "precio landing page", "precio CRM a medida", "cotizar página web", "cotizar desarrollo de software"],
    contact: ["cotizar página web", "contratar desarrollo web", "presupuesto página web", "cotizar CRM", "contacto agencia de desarrollo de software"],
    about: ["agencia de desarrollo de software", "desarrollador web", "equipo de desarrollo web", "desarrollo web con atención directa"],
    faq: ["preguntas frecuentes páginas web", "cuánto demora una página web", "dominio y hosting incluidos", "pago en cuotas página web"],
  },
  en: {
    brand: ["Acmora", "Acmora web development", "Acmora software", "Acmora development agency"],
    general: [
      "software development agency",
      "software development company",
      "custom software development",
      "software development services",
      "web development",
      "web development services",
      "website development",
      "website services",
      "website design",
      "professional web design",
      "website creation",
      "websites for businesses",
      "websites for small businesses",
      "websites for entrepreneurs",
      "web application development",
      "landing pages",
      "CRM for businesses",
      "custom CRM",
      "website maintenance",
    ],
    landing: [
      "landing page",
      "landing pages",
      "landing page development",
      "landing page design",
      "landing page for businesses",
      "landing page for campaigns",
      "landing page with WhatsApp",
      "landing page price",
    ],
    multipagina: [
      "corporate website",
      "business website",
      "website development company",
      "website with blog",
      "self-managed website",
      "professional website development",
      "website price",
    ],
    crm: [
      "custom CRM",
      "bespoke CRM",
      "CRM development",
      "CRM for businesses",
      "CRM software for small businesses",
      "customer management system",
      "custom business software",
      "sales CRM",
      "enterprise software development",
    ],
    maintenance: ["website maintenance", "website support", "technical website support", "website security updates", "website backups", "monthly website maintenance"],
    pricing: ["website price", "how much does a website cost", "landing page price", "custom CRM price", "website quote", "software development quote"],
    contact: ["website quote", "hire web development", "website budget", "CRM quote", "software development agency contact"],
    about: ["software development agency", "web developer", "web development team", "web development with direct service"],
    faq: ["website FAQ", "how long does a website take", "domain and hosting included", "website installment payments"],
  },
};

/** Grupo de palabras clave de cada servicio del catalogo. */
export const SERVICE_KEYWORDS: Record<string, Group> = {
  "landing-page": "landing",
  "pagina-web-multipagina": "multipagina",
  "crm-personalizado": "crm",
  "mantencion-web": "maintenance",
};

/** Palabras clave de una pagina: marca, generales y las del tema, sin repetir. */
export function keywordsFor(locale: Locale, ...groups: Group[]): string[] {
  const k = KEYWORDS[locale];
  return Array.from(new Set([...k.brand, ...groups.flatMap((g) => k[g]), ...k.general]));
}
