"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Tooltip from "@/shared/components/core/Tooltip";
import { cn } from "@/shared/lib/cn";

type Item = { locale: string; lang: string; short: string; title: string; name: string; home: string; switching: string };

/** Spinner circular indeterminado estilo Material: arco azul que gira y se alarga y encoge. Decorativo (el aviso va aparte). */
function Spinner() {
  return (
    <span aria-hidden="true" data-spinner="" className="absolute inset-0 grid place-items-center">
      <svg viewBox="0 0 24 24" className="g-spinner size-5">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

type Props = {
  current: string;
  label: string;
  items: Item[];
  /** Ruta localizada actual -> misma ruta en cada otro idioma. Se arma en servidor. */
  equivalents: Record<string, Record<string, string>>;
};

/**
 * Selector de idioma. Al elegir el otro idioma, el propio boton muestra un spinner circular de Material (arco azul que gira) en lugar
 * de su sigla, sin cambiar de tamano ni cubrir la pagina; queda resaltado, ocupado (aria-busy) y no repite el clic, y un aviso
 * oculto anuncia "Cambiando a ..." a los lectores de pantalla. Cuando llega la pagina en el nuevo idioma el selector se renueva solo.
 */
export default function LocaleSwitch({ current, label, items, equivalents }: Props) {
  const pathname = usePathname();
  // Idioma de destino mientras carga la pagina. Queda activo solo para la ruta de origen:
  // al cambiar la ruta (llega el nuevo idioma) deja de mostrarse sin necesidad de un efecto.
  const [pending, setPending] = useState<{ from: string; to: string; text: string } | null>(null);
  const active = pending && pending.from === pathname ? pending : null;
  const switching = active?.text ?? null;

  useEffect(() => {
    if (!switching) return;
    // Salvaguarda: si la navegacion falla, el aviso no queda pegado.
    const timer = setTimeout(() => setPending(null), 8000);
    return () => clearTimeout(timer);
  }, [switching]);

  return (
    <>
      <nav aria-label={label} aria-busy={switching ? true : undefined}>
        <ul className="flex items-center rounded-pill border border-line p-0.5 text-sm font-medium">
          {items.map((it) => (
            <li key={it.locale}>
              {it.locale === current ? (
                <Tooltip text={it.name}>
                  {(describedBy) => (
                    <span aria-current="true" aria-describedby={describedBy} className="inline-flex h-10 min-w-10 items-center justify-center rounded-pill sm:min-w-11 bg-blue-soft px-2 text-blue sm:px-3">
                      {it.short}
                    </span>
                  )}
                </Tooltip>
              ) : (
                <Tooltip text={it.title}>
                  {(describedBy) => (
                    <NextLink
                      href={equivalents[pathname]?.[it.locale] ?? it.home}
                      lang={it.lang}
                      hrefLang={it.lang}
                      title={it.title}
                      aria-describedby={describedBy}
                      onClick={(e) => {
                        // Un segundo clic mientras carga no repite la navegacion.
                        if (switching) e.preventDefault();
                        else setPending({ from: pathname, to: it.locale, text: it.switching });
                      }}
                      className={cn(
                        "relative inline-flex h-10 min-w-10 items-center justify-center rounded-pill px-2 no-underline transition-colors duration-(--duration-enter) sm:min-w-11 sm:px-3",
                        active?.to === it.locale ? "bg-blue-soft text-blue" : "text-ink-soft hover:bg-surface hover:text-ink",
                      )}
                    >
                      {/* La sigla sigue ocupando su sitio (invisible) para que el boton no cambie de ancho. */}
                      <span className={active?.to === it.locale ? "invisible" : undefined}>{it.short}</span>
                      {active?.to === it.locale ? <Spinner /> : null}
                    </NextLink>
                  )}
                </Tooltip>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <p role="status" aria-live="polite" className="sr-only">
        {switching}
      </p>
    </>
  );
}
