"use client";

import { Mail, MessageCircle } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { Locale } from "@/i18n/routing";
import AppLink from "@/shared/components/core/AppLink";
import Button from "@/shared/components/core/Button";
import { buildQuoteMessage, mailtoUrl, whatsappUrl, type QuoteShareLabels } from "../quote-message";
import { SERVICE_OPTIONS } from "../state";
import QuoteFields, { leftWithValue, openLink, useLiveValidation, type FieldsCopy } from "./QuoteFields";

type Action = { label: string; title: string };

export type ContactCopy = FieldsCopy & {
  mail: Action;
  whatsapp: Action;
  share: QuoteShareLabels;
  done: { mail: string; whatsapp: string; fallback: string; mailLinkTitle: string };
};

type Props = {
  locale: Locale;
  copy: ContactCopy;
  privacyHref: string;
  termsHref: string;
  contact: { email: string; whatsappHref: string };
};

/**
 * Formulario de la pagina de contacto: el mismo formato que el dialogo de cotizacion (campos, consentimiento y botones).
 * Primero se validan los campos (en vivo y otra vez al pulsar un boton); solo con todo correcto se abre la app de correo
 * o WhatsApp con el mensaje ya escrito. No hay estado de "enviando": no se envia nada desde el sitio.
 */
export default function ContactForm({ locale, copy, privacyHref, termsHref, contact }: Props) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const { shown, sync, fieldOf, validateAll } = useLiveValidation(formRef);
  const [sent, setSent] = useState<"mail" | "whatsapp" | null>(null);

  const send = (via: "mail" | "whatsapp") => {
    const values = validateAll();
    if (!values) {
      setSent(null);
      return;
    }
    const message = buildQuoteMessage({ labels: copy.share, serviceName: copy.services[values.service as (typeof SERVICE_OPTIONS)[number]], plan: "", values });
    openLink(via === "mail" ? mailtoUrl(contact.email, message) : whatsappUrl(contact.whatsappHref, message), via === "whatsapp");
    setSent(via);
  };

  return (
    <form
      ref={formRef}
      noValidate
      onChange={(e) => sync({}, fieldOf(e.target) ?? undefined)}
      onBlur={(e) => {
        const f = fieldOf(e.target);
        if (f) sync({}, leftWithValue(e.target) ? f : undefined);
      }}
      onSubmit={(e) => e.preventDefault()}
      className="mt-8 grid max-w-[40rem] gap-4 [&_p]:mt-0"
    >
      <QuoteFields uid={uid} locale={locale} copy={copy} privacyHref={privacyHref} termsHref={termsHref} defaultService="" shown={shown} sync={sync} />

      {sent ? (
        <div role="status" className="grid gap-1 rounded-[14px] bg-blue-soft px-4 py-3 text-sm">
          <p>{sent === "mail" ? copy.done.mail : copy.done.whatsapp}</p>
          {sent === "mail" ? (
            <p className="text-ink-soft">
              {copy.done.fallback}{" "}
              <AppLink href={`mailto:${contact.email}`} title={copy.done.mailLinkTitle} className="text-blue underline underline-offset-4">
                {contact.email}
              </AppLink>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" title={copy.mail.title} onClick={() => send("mail")} className="gap-2">
          <Mail aria-hidden="true" size={18} />
          {copy.mail.label}
        </Button>
        <Button type="button" title={copy.whatsapp.title} onClick={() => send("whatsapp")} className="gap-2">
          <MessageCircle aria-hidden="true" size={18} />
          {copy.whatsapp.label}
        </Button>
      </div>
    </form>
  );
}
