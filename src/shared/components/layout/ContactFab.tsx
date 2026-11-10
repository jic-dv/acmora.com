"use client";

import { Mail, MessageCircle, FileText, X } from "lucide-react";
import NextLink from "next/link";
import { useEffect, useRef, useState } from "react";
import { COMPANY, whatsappLink } from "@/shared/constants/site";
import { cn } from "@/shared/lib/cn";

type Action = { label: string; title: string };
export type ContactFabCopy = {
  open: Action;
  close: Action;
  panel: string;
  nudge: string;
  online: string;
  greeting: string;
  whatsapp: Action & { message: string };
  form: Action;
  mail: Action & { subject: string };
  photo: { alt: string; title: string };
  role: string;
};

const PHOTO = "/images/author/author.webp";

/** Punto verde "activo" con onda animada. Decorativo: el estado lo dice el texto "Activo ahora" del panel y el nombre accesible del boton. */
function OnlineDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("absolute", className)}>
      <span className="absolute inset-0 animate-ping rounded-full bg-[#34a853] opacity-70" />
      <span className="relative block size-full rounded-full bg-[#1e8e3e] ring-2 ring-paper" />
    </span>
  );
}

/**
 * Boton flotante de contacto estilo Google (FAB circular con la foto de quien atiende), en la esquina inferior izquierda. Llama la atencion sin molestar: una onda azul
 * que se expande cada pocos segundos, un pequeno salto cada cierto rato y, una sola vez por visita, un globo con "Hablamos de tu
 * proyecto?" que se retira solo (a la derecha del boton). Un punto verde animado indica que esta activo. Al abrirlo muestra una tarjeta con la foto, el
 * estado, un saludo y tres vias: WhatsApp con mensaje escrito, formulario y correo. No es modal: se cierra con Esc, con un clic
 * fuera o con su boton, y devuelve el foco al boton. Con movimiento reducido las animaciones no se repiten.
 */
export default function ContactFab({ copy, contactHref }: { copy: ContactFabCopy; contactHref: string }) {
  const [open, onOpenChange] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [bubble, setBubble] = useState(false);

  // Globo de invitacion: aparece a los 5 s y se va a los 13 s (una vez por visita; no guarda nada en el navegador).
  useEffect(() => {
    const show = setTimeout(() => setBubble(true), 5000);
    const hide = setTimeout(() => setBubble(false), 13000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onOpenChange(false);
      button.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (e.target instanceof Node && !root.current?.contains(e.target)) onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const action = "inline-flex h-11 w-full items-center justify-center gap-2 rounded-pill px-5 font-medium no-underline transition-colors duration-(--duration-enter)";

  return (
    <div ref={root} className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] sm:left-6 print:hidden">
      {open ? (
        <div
          ref={panel}
          role="dialog"
          aria-label={copy.panel}
          tabIndex={-1}
          className="fab-panel absolute bottom-full left-0 mb-3 w-[min(21rem,calc(100vw-2rem))] origin-bottom-left rounded-[24px] bg-paper p-5 text-ink shadow-raised outline-none"
        >
          <div className="flex items-start gap-3">
            <span className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- next/image escribe un atributo style en el HTML, que la CSP (sin unsafe-inline) bloquea; la imagen ya viene optimizada en WebP (64 px). */}
              <img src={PHOTO} alt={copy.photo.alt} title={copy.photo.title} width={64} height={64} decoding="async" className="size-14 rounded-full object-cover" />
              <OnlineDot className="bottom-0 right-0 size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 font-medium leading-snug">{COMPANY.author.name}</p>
              <p className="m-0 text-sm leading-snug text-ink-soft">{copy.role}</p>
              <p className="m-0 mt-1 flex items-center gap-1.5 text-sm font-medium leading-snug text-add">
                <span aria-hidden="true" className="size-2 rounded-full bg-current" />
                {copy.online}
              </p>
            </div>
            <button
              type="button"
              aria-label={copy.close.label}
              title={copy.close.title}
              onClick={() => {
                onOpenChange(false);
                button.current?.focus();
              }}
              className="-mr-2 -mt-2 grid size-10 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-surface-strong"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>
          <p className="m-0 mt-4 text-ink-soft">{copy.greeting}</p>
          <div className="mt-5 grid gap-2.5">
            <a
              href={whatsappLink(copy.whatsapp.message)}
              target="_blank"
              rel="noopener noreferrer"
              title={copy.whatsapp.title}
              className={cn(action, "bg-blue text-on-blue hover:bg-blue-hover")}
            >
              <MessageCircle aria-hidden="true" size={20} />
              {copy.whatsapp.label}
            </a>
            <NextLink href={contactHref} title={copy.form.title} onClick={() => onOpenChange(false)} className={cn(action, "border border-line text-blue hover:bg-blue-soft")}>
              <FileText aria-hidden="true" size={20} />
              {copy.form.label}
            </NextLink>
            <a href={`mailto:${COMPANY.email}?subject=${encodeURIComponent(copy.mail.subject)}`} title={copy.mail.title} className={cn(action, "text-blue hover:bg-blue-soft")}>
              <Mail aria-hidden="true" size={20} />
              {copy.mail.label}
            </a>
          </div>
        </div>
      ) : null}

      {/* Globo de invitacion: decorativo (el panel dice lo mismo), no capta el puntero. */}
      {bubble && !open ? (
        <span
          aria-hidden="true"
          className="fab-bubble pointer-events-none absolute left-full top-1/2 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-pill bg-paper px-4 py-2 text-[0.9375rem] font-medium text-ink shadow-raised min-[420px]:block"
        >
          {copy.nudge}
        </span>
      ) : null}

      <button
        ref={button}
        type="button"
        aria-label={copy.open.label}
        title={copy.open.title}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={cn("relative grid size-12 place-items-center rounded-full shadow-raised sm:size-14", !open && "fab-nudge")}
      >
        {!open ? <span aria-hidden="true" className="fab-ring pointer-events-none absolute inset-0 rounded-full border-2 border-blue" /> : null}
        {/* eslint-disable-next-line @next/next/no-img-element -- next/image escribe un atributo style en el HTML, que la CSP (sin unsafe-inline) bloquea; la imagen ya viene optimizada en WebP (64 px). */}
        <img
          src={PHOTO}
          alt={copy.photo.alt}
          title={copy.open.title}
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          className="size-full rounded-full object-cover ring-2 ring-paper"
        />
        <OnlineDot className="bottom-0 right-0 size-3.5 sm:size-4" />
      </button>
    </div>
  );
}
