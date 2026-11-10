"use client";

import { ChevronDown } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/shared/lib/cn";

export type TocItem = { id: string; label: string; title: string };
export type TocDoc = { label: string; title: string; href: string; current: boolean };

type Props = {
  /** Nombre accesible de la navegacion y titulo de la lista de secciones. */
  label: string;
  items: TocItem[];
  /** Encabezado y enlaces entre los documentos legales hermanos (privacidad, terminos, cookies). */
  docsLabel: string;
  docs: TocDoc[];
};

/** Linea de lectura bajo la cabecera fija: la seccion activa es la ultima cuyo titular ya paso por ella. */
const READ_LINE = 170;

/** Id del titular activo, leido del DOM al hacer scroll o cambiar el tamano (sin estado en React ni efectos). */
function useActiveId(ids: string[]) {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener("scroll", notify, { passive: true });
      window.addEventListener("resize", notify);
      return () => {
        window.removeEventListener("scroll", notify);
        window.removeEventListener("resize", notify);
      };
    },
    () => {
      let active = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(`h-${id}`);
        if (el && el.getBoundingClientRect().top <= READ_LINE) active = id;
      }
      // Al final de la pagina la ultima seccion puede no alcanzar la linea de lectura.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) active = ids[ids.length - 1] ?? active;
      return active;
    },
    () => ids[0] ?? "",
  );
}

/**
 * Navegacion lateral entre las secciones de un documento largo, como en las politicas de Google: a la izquierda en pantallas
 * anchas (fija mientras se lee, con la seccion actual resaltada) y como un desplegable "En esta pagina" en pantallas chicas.
 * Arriba lista los documentos legales hermanos para saltar de uno a otro.
 */
export default function DocToc({ label, items, docsLabel, docs }: Props) {
  const active = useActiveId(items.map((i) => i.id));

  const list = (
    <ul className="m-0 grid list-none gap-0.5 p-0">
      {items.map((i) => {
        const on = i.id === active;
        return (
          <li key={i.id} className="m-0">
            <a
              href={`#h-${i.id}`}
              title={i.title}
              aria-current={on ? "location" : undefined}
              className={cn(
                "plain block rounded-r-full border-l-2 py-2 pl-4 pr-3 text-sm leading-snug no-underline transition-colors duration-(--duration-enter)",
                on ? "border-blue bg-blue-soft font-medium text-blue" : "border-line text-ink-soft hover:bg-surface hover:text-ink",
              )}
            >
              {i.label}
            </a>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <details className="group mb-6 rounded-card border border-line-strong lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-medium [&::-webkit-details-marker]:hidden">
          {label}
          <ChevronDown aria-hidden="true" size={20} className="shrink-0 text-ink-soft transition-transform duration-(--duration-enter) group-open:rotate-180" />
        </summary>
        <nav aria-label={label} className="grid gap-5 px-3 pb-4">
          {list}
        </nav>
      </details>

      <aside className="hidden lg:block">
        <nav aria-label={label} className="sticky top-24 grid max-h-[calc(100dvh-7rem)] gap-6 overflow-y-auto pr-2 [scrollbar-width:thin]">
          <div className="grid gap-2">
            <p className="m-0 px-4 text-xs font-medium uppercase tracking-widest text-ink-soft">{docsLabel}</p>
            <ul className="m-0 grid list-none gap-0.5 p-0">
              {docs.map((d) => (
                <li key={d.href} className="m-0">
                  <a
                    href={d.href}
                    title={d.title}
                    aria-current={d.current ? "page" : undefined}
                    className={cn(
                      "plain block rounded-full px-4 py-2 text-sm no-underline transition-colors duration-(--duration-enter)",
                      d.current ? "bg-blue-soft font-medium text-blue" : "text-ink hover:bg-surface",
                    )}
                  >
                    {d.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-2">
            <p className="m-0 px-4 text-xs font-medium uppercase tracking-widest text-ink-soft">{label}</p>
            {list}
          </div>
        </nav>
      </aside>
    </>
  );
}
