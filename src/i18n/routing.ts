import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "always",
  // Sin cookie de idioma: el sitio no guarda nada en el navegador, asi no requiere banner de consentimiento.
  localeCookie: false,
  pathnames: {
    "/": "/",
    "/services": { es: "/servicios", en: "/services" },
    "/services/[slug]": { es: "/servicios/[slug]", en: "/services/[slug]" },
    "/projects": { es: "/proyectos", en: "/projects" },
    "/pricing": { es: "/precios", en: "/pricing" },
    "/faq": { es: "/preguntas-frecuentes", en: "/faq" },
    "/about": { es: "/nosotros", en: "/about" },
    "/contact": { es: "/contacto", en: "/contact" },
    "/privacy": { es: "/privacidad", en: "/privacy" },
    "/terms": { es: "/terminos", en: "/terms" },
    "/cookies": { es: "/cookies", en: "/cookies" },
  },
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;
