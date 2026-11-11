export const SERVICE_OPTIONS = ["landing", "multipagina", "crm", "mantencion", "otro"] as const;

/** Limites de los campos, iguales en el dialogo de cotizacion, el formulario de contacto y la validacion del servidor. */
export const LIMITS = { nameMin: 2, nameMax: 60, messageMin: 10, messageMax: 500, phoneMax: 12 } as const;

/**
 * Prefijos telefonicos del selector, de mayor a menor cercania: Chile, Latinoamerica y los paises con mas contacto
 * comercial. Cada codigo es unico (el +1 agrupa Estados Unidos y Canada). `iso` enlaza con la bandera del selector.
 */
export const COUNTRIES = [
  { code: "+56", iso: "CL", name: { es: "Chile", en: "Chile" } },
  { code: "+54", iso: "AR", name: { es: "Argentina", en: "Argentina" } },
  { code: "+591", iso: "BO", name: { es: "Bolivia", en: "Bolivia" } },
  { code: "+55", iso: "BR", name: { es: "Brasil", en: "Brazil" } },
  { code: "+57", iso: "CO", name: { es: "Colombia", en: "Colombia" } },
  { code: "+593", iso: "EC", name: { es: "Ecuador", en: "Ecuador" } },
  { code: "+595", iso: "PY", name: { es: "Paraguay", en: "Paraguay" } },
  { code: "+51", iso: "PE", name: { es: "Perú", en: "Peru" } },
  { code: "+598", iso: "UY", name: { es: "Uruguay", en: "Uruguay" } },
  { code: "+58", iso: "VE", name: { es: "Venezuela", en: "Venezuela" } },
  { code: "+52", iso: "MX", name: { es: "México", en: "Mexico" } },
  { code: "+506", iso: "CR", name: { es: "Costa Rica", en: "Costa Rica" } },
  { code: "+507", iso: "PA", name: { es: "Panamá", en: "Panama" } },
  { code: "+502", iso: "GT", name: { es: "Guatemala", en: "Guatemala" } },
  { code: "+503", iso: "SV", name: { es: "El Salvador", en: "El Salvador" } },
  { code: "+504", iso: "HN", name: { es: "Honduras", en: "Honduras" } },
  { code: "+505", iso: "NI", name: { es: "Nicaragua", en: "Nicaragua" } },
  { code: "+53", iso: "CU", name: { es: "Cuba", en: "Cuba" } },
  { code: "+1", iso: "US", name: { es: "Estados Unidos y Canadá", en: "United States and Canada" } },
  { code: "+34", iso: "ES", name: { es: "España", en: "Spain" } },
  { code: "+351", iso: "PT", name: { es: "Portugal", en: "Portugal" } },
  { code: "+44", iso: "GB", name: { es: "Reino Unido", en: "United Kingdom" } },
  { code: "+353", iso: "IE", name: { es: "Irlanda", en: "Ireland" } },
  { code: "+33", iso: "FR", name: { es: "Francia", en: "France" } },
  { code: "+49", iso: "DE", name: { es: "Alemania", en: "Germany" } },
  { code: "+39", iso: "IT", name: { es: "Italia", en: "Italy" } },
  { code: "+31", iso: "NL", name: { es: "Países Bajos", en: "Netherlands" } },
  { code: "+41", iso: "CH", name: { es: "Suiza", en: "Switzerland" } },
  { code: "+90", iso: "TR", name: { es: "Turquía", en: "Turkey" } },
  { code: "+972", iso: "IL", name: { es: "Israel", en: "Israel" } },
  { code: "+971", iso: "AE", name: { es: "Emiratos Árabes Unidos", en: "United Arab Emirates" } },
  { code: "+27", iso: "ZA", name: { es: "Sudáfrica", en: "South Africa" } },
  { code: "+86", iso: "CN", name: { es: "China", en: "China" } },
  { code: "+81", iso: "JP", name: { es: "Japón", en: "Japan" } },
  { code: "+82", iso: "KR", name: { es: "Corea del Sur", en: "South Korea" } },
  { code: "+91", iso: "IN", name: { es: "India", en: "India" } },
  { code: "+65", iso: "SG", name: { es: "Singapur", en: "Singapore" } },
  { code: "+63", iso: "PH", name: { es: "Filipinas", en: "Philippines" } },
  { code: "+61", iso: "AU", name: { es: "Australia", en: "Australia" } },
  { code: "+64", iso: "NZ", name: { es: "Nueva Zelanda", en: "New Zealand" } },
] as const;

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export type ContactField = "name" | "email" | "phone" | "service" | "message" | "consent";

export type ContactValues = { name: string; email: string; phoneCountry: string; phone: string; service: string; message: string };

export type ContactState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; code: "invalid" | "rate" | "unavailable" | "generic"; fields: ContactField[]; values: ContactValues };

export const initialContactState: ContactState = { status: "idle" };

/** Dialogo "Cotizar plan": todos los campos son obligatorios y no pide correo (se responde por telefono). */
export type QuoteField = "name" | "phone" | "service" | "message" | "consent";

/** `consent`: aceptacion expresa de los Terminos y Condiciones y la Politica de Privacidad, y autorizacion del tratamiento de datos. */
export type QuoteValues = { name: string; phoneCountry: string; phone: string; service: string; message: string; consent: boolean };

export type QuoteState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; code: "invalid" | "rate" | "unavailable" | "generic"; fields: QuoteField[]; values: QuoteValues };

export const initialQuoteState: QuoteState = { status: "idle" };
