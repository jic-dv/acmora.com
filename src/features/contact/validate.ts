import { COUNTRY_CODES, SERVICE_OPTIONS, type ContactField } from "./state";

export type ContactDraft = { name: string; email: string; phoneCountry: string; phone: string; service: string; message: string; consent: boolean };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Mismas reglas que `contactSchema`, sin Zod para no cargarlo en el cliente: devuelve los campos invalidos. */
export function validateContact(v: ContactDraft): ContactField[] {
  const failed: ContactField[] = [];
  const name = v.name.trim();
  if (name.length < 2 || name.length > 100) failed.push("name");
  const email = v.email.trim();
  if (!EMAIL.test(email) || email.length > 160) failed.push("email");
  // Telefono opcional: solo digitos; Chile 9 digitos, el resto entre 6 y 12.
  const phone = v.phone.trim();
  if (phone !== "") {
    const ok = /^\d+$/.test(phone) && phone.length <= 12 && COUNTRY_CODES.some((c) => c === v.phoneCountry) && (v.phoneCountry === "+56" ? phone.length === 9 : phone.length >= 6);
    if (!ok) failed.push("phone");
  }
  if (!SERVICE_OPTIONS.some((s) => s === v.service)) failed.push("service");
  if (v.message.trim().length > 500) failed.push("message");
  if (!v.consent) failed.push("consent");
  return failed;
}
