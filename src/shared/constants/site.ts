/**
 * Datos de la empresa, tomados de podiochile.com (terminos y politica de privacidad, revisados el 2026-11-04).
 * Pendientes de confirmar por el titular: RUT y direccion. Mientras no se publiquen, las paginas no los muestran.
 */
export const COMPANY = {
  name: "Acmora",
  /** Logos oficiales: horizontal (cabecera, claro y oscuro), isotipo transparente e isotipo con fondo (datos estructurados y redes). */
  logo: {
    light: "/images/logo/acmora-logo.svg",
    dark: "/images/logo/acmora-logo-dark.svg",
    isotype: "/images/logo/acmora-logo-isotype.png",
    square: "/images/logo/acmora-logo-isotypebg.png",
  },
  /** Nombre de fantasia. El titular es una persona natural. */
  legalName: "José Ignacio Contreras Castro",
  /** Correo de contacto y destino de todas las consultas del sitio (formulario y dialogo de cotizacion). */
  email: "contact@acmora.com",
  /** Mismo correo para consultas de datos personales (Ley 21.719). */
  privacyEmail: "contact@acmora.com",
  phone: "+56 9 5173 0743",
  phoneHref: "tel:+56951730743",
  whatsappHref: "https://wa.me/56951730743",
  /** Redes de quien creo el sitio (firma del pie de pagina). */
  author: { name: "José Ignacio Contreras Castro", linkedin: "https://www.linkedin.com/in/jic-dv/", github: "https://github.com/jic-dv" },
  address: { locality: "Santiago", region: "Región Metropolitana", country: "CL" },
  hours: { es: "Lunes a domingo, 9:00 a 21:00 hrs", en: "Monday to Sunday, 9:00 to 21:00" },
} as const;

/** Enlace a WhatsApp con el mensaje ya escrito: quien lo abre solo debe presionar enviar. */
export const whatsappLink = (message: string) => `${COMPANY.whatsappHref}?text=${encodeURIComponent(message)}`;

export const SITE_REVISION = { version: "1.0.0", date: "2026-11-04" } as const;

/** Version y fecha de los textos legales (idem podiochile.com, version 1.0 del 21 de agosto de 2026). */
export const LEGAL_VERSION = { version: "1.0", date: "2026-08-21" } as const;

export const HTML_LANG = { es: "es-CL", en: "en" } as const;
export const OG_LOCALE = { es: "es_CL", en: "en_US" } as const;
