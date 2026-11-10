"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type TabItem = {
  id: string;
  label: string;
  /** Descripcion de la accion de la pestana (distinta del texto visible). */
  title: string;
  icon?: ReactNode;
  /** Contenido del panel, armado en servidor. Todos los paneles viajan en el HTML; solo el activo se muestra. */
  panel: ReactNode;
};

type ScrollLabel = { label: string; title: string };
type Props = {
  label: string;
  items: TabItem[];
  /** Botones de desplazamiento de la fila cuando no caben todas las pestanas. */
  scroll: { prev: ScrollLabel; next: ScrollLabel };
};

// La pestana activa se refleja en el hash (#landing-page): se puede compartir y sobrevive a recargar sin crear cookies.
const subscribe = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
const hash = () => window.location.hash.slice(1);

/** Flecha de desplazamiento sobre un degradado del color de fondo. Redundante con las flechas del teclado: queda fuera del orden de tabulacion. */
function ScrollButton({ side, visible, copy, onClick }: { side: "start" | "end"; visible: boolean; copy: ScrollLabel; onClick: () => void }) {
  const Arrow = side === "start" ? ChevronLeft : ChevronRight;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-y-0 z-10 flex w-16 items-center from-paper via-paper/90 to-transparent transition-[opacity,visibility] duration-150",
        side === "start" ? "left-0 justify-start bg-linear-to-r" : "right-0 justify-end bg-linear-to-l",
        visible ? "visible opacity-100" : "invisible opacity-0",
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        title={copy.title}
        aria-label={copy.label}
        onClick={onClick}
        className="pointer-events-auto grid size-9 place-items-center rounded-full bg-paper text-ink shadow-card transition-colors duration-(--duration-enter) hover:bg-blue-soft"
      >
        <Arrow aria-hidden="true" size={20} />
      </button>
    </div>
  );
}

/**
 * Pestanas estilo Google (Material, primarias): fila con linea inferior, texto en azul y barra de 3 px bajo la pestana
 * activa, estado al pasar el cursor, desplazables en pantallas angostas. Patron ARIA de pestanas con activacion
 * automatica: flechas, Inicio y Fin cambian de pestana y mueven el foco; solo la activa entra en el orden de tabulacion.
 */
export default function Tabs({ label, items, scroll }: Props) {
  const uid = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  // Hay mas pestanas fuera de vista a cada lado: se muestran degradado y flecha solo donde falta contenido.
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => {
      const start = list.scrollLeft > 1;
      const end = list.scrollLeft + list.clientWidth < list.scrollWidth - 1;
      setEdges((p) => (p.start === start && p.end === end ? p : { start, end }));
    };
    const observer = new ResizeObserver(update);
    observer.observe(list);
    list.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      list.removeEventListener("scroll", update);
    };
  }, []);

  // Desplaza la fila tres cuartos de su ancho (o sin animacion si la persona pidio menos movimiento).
  const nudge = (dir: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({ left: dir * list.clientWidth * 0.75, behavior: reduce ? "instant" : "smooth" });
  };
  const fromHash = useSyncExternalStore(subscribe, hash, () => "");
  const first = items[0]?.id ?? "";
  const active = items.some((it) => it.id === fromHash) ? fromHash : first;

  // Deja la pestana activa a la vista en la fila desplazable (por ejemplo, al abrir la pagina con un hash). Mueve solo la fila, no la pagina.
  useEffect(() => {
    const list = listRef.current;
    const tab = refs.current[items.findIndex((it) => it.id === active)];
    if (list && tab) list.scrollTo({ left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2 });
  }, [active, items]);

  const select = (id: string, focus = false) => {
    if (id === active) return;
    // replaceState no genera historial por cada pestana ni desplaza la pagina; el evento avisa a quien escucha el hash.
    window.history.replaceState(null, "", `#${id}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    if (focus) refs.current[items.findIndex((it) => it.id === id)]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const i = items.findIndex((it) => it.id === active);
    const to = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    const next = items[(to + items.length) % items.length];
    if (next) select(next.id, true);
  };

  return (
    <div className="mt-8">
      <div className="relative border-b border-line">
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex snap-x snap-proximity overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((it, n) => {
          const on = it.id === active;
          return (
            <button
              key={it.id}
              ref={(el) => {
                refs.current[n] = el;
              }}
              type="button"
              role="tab"
              id={`${uid}-tab-${it.id}`}
              data-tab-id={it.id}
              aria-selected={on}
              aria-controls={`${uid}-panel-${it.id}`}
              tabIndex={on ? 0 : -1}
              title={it.title}
              onClick={() => select(it.id)}
              className={cn(
                "relative inline-flex h-12 shrink-0 snap-center items-center gap-2 whitespace-nowrap px-5 text-[0.9375rem] font-medium transition-colors duration-(--duration-enter)",
                "after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:origin-center after:scale-x-0 after:rounded-t-full after:bg-blue after:transition-transform after:duration-200",
                on ? "text-blue after:scale-x-100" : "text-ink-soft hover:bg-surface hover:text-ink",
              )}
            >
              {it.icon}
              {it.label}
            </button>
          );
        })}
      </div>
        <ScrollButton side="start" visible={edges.start} copy={scroll.prev} onClick={() => nudge(-1)} />
        <ScrollButton side="end" visible={edges.end} copy={scroll.next} onClick={() => nudge(1)} />
      </div>
      {items.map((it) => (
        <div key={it.id} role="tabpanel" id={`${uid}-panel-${it.id}`} aria-labelledby={`${uid}-tab-${it.id}`} hidden={it.id !== active} tabIndex={0} className="pt-2 focus-visible:rounded-card">
          {it.panel}
        </div>
      ))}
    </div>
  );
}
