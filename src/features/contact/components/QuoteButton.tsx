import type { Locale } from "@/i18n/routing";
import { getCopy } from "@/content/docs";
import { buttonStyles, type ButtonVariant } from "@/shared/components/core/Button";
import { COMPANY } from "@/shared/constants/site";
import { cn } from "@/shared/lib/cn";
import type { QuoteOffer } from "@/shared/lib/doc";
import { pathFor } from "@/shared/lib/seo";
import QuoteDialog from "./QuoteDialog";

type Props = {
  locale: Locale;
  label: string;
  title: string;
  variant?: ButtonVariant;
  size?: "md" | "lg";
  className?: string;
  /** Servicio (opcion del formulario), nombre legible del servicio y del plan. Sin el, el dialogo es una cotizacion general. */
  quote?: { service: string; serviceName: string; plan: string; offer?: QuoteOffer };
};

// Componente de servidor: arma el contenido del dialogo y lo pasa al cliente (boton de la cabecera, del hero y de cada plan).
export default function QuoteButton({ locale, label, title, variant = "primary", size, className, quote }: Props) {
  const f = getCopy(locale).form;
  const q = f.quote;
  return (
    <QuoteDialog
      locale={locale}
      privacyHref={pathFor(locale, { pathname: "/privacy" })}
      termsHref={pathFor(locale, { pathname: "/terms" })}
      trigger={{ label, title, className: cn(buttonStyles({ variant, size }), className) }}
      quote={quote ? { service: quote.service, plan: quote.plan, summary: q.plan(quote.serviceName, quote.plan), offer: quote.offer } : { service: "", plan: "", summary: q.generic }}
      contact={{ email: COMPANY.email, whatsappHref: COMPANY.whatsappHref }}
      copy={{
        title: q.title,
        steps: q.steps,
        next: q.next,
        back: q.back,
        step2: q.step2,
        name: q.name,
        phone: q.phone,
        service: q.service,
        services: f.services,
        message: q.message,
        consent: q.consent,
        cancel: q.cancel,
        mail: q.mail,
        whatsapp: q.whatsapp,
        share: q.share,
        done: q.done,
        errors: q.errors,
      }}
    />
  );
}
