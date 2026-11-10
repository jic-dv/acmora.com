import type { Locale } from "@/i18n/routing";
import { getCopy } from "@/content/docs";
import { COMPANY } from "@/shared/constants/site";
import { pathFor } from "@/shared/lib/seo";
import ContactForm from "./ContactForm";

// Componente de servidor: arma las props del formulario desde el contenido. Se usa solo en la ruta de contacto,
// asi el JavaScript del formulario (y su dependencia de estado) no viaja en las demas paginas.
export default function ContactSection({ locale }: { locale: Locale }) {
  const f = getCopy(locale).form;
  const q = f.quote;
  return (
    <ContactForm
      locale={locale}
      privacyHref={pathFor(locale, { pathname: "/privacy" })}
      termsHref={pathFor(locale, { pathname: "/terms" })}
      contact={{ email: COMPANY.email, whatsappHref: COMPANY.whatsappHref }}
      copy={{
        name: q.name,
        phone: q.phone,
        service: q.service,
        services: f.services,
        message: q.message,
        consent: q.consent,
        errors: q.errors,
        mail: q.mail,
        whatsapp: q.whatsapp,
        share: f.contactShare,
        done: q.done,
      }}
    />
  );
}
