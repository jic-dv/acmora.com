"use client";

import { ArrowUp } from "lucide-react";
import { useSyncExternalStore } from "react";
import Tooltip from "@/shared/components/core/Tooltip";
import { cn } from "@/shared/lib/cn";

type Props = { label: string; title: string };

const SHOW_AFTER_PX = 320;

// El boton aparece al detectar que la persona bajo por la pagina. Solo se re-renderiza cuando cambia el booleano.
const subscribe = (notify: () => void) => {
  window.addEventListener("scroll", notify, { passive: true });
  return () => window.removeEventListener("scroll", notify);
};
const scrolled = () => window.scrollY > SHOW_AFTER_PX;

/**
 * Boton flotante para volver al inicio, estilo Google (FAB pequeno de Material): aparece con una animacion de escala al bajar y
 * desaparece al volver arriba. Elevacion con el mismo sistema de sombras del sitio (anillo en tema oscuro), globo de ayuda a la
 * izquierda y respeto por el area segura de los moviles. Va en la esquina inferior derecha, a la misma altura que el boton de
 * contacto (esquina izquierda, `ContactFab`): mismo margen inferior y area segura, con el ajuste justo para que los centros de
 * ambos coincidan (este es un poco mas chico). Los dos se achican en pantallas pequenas.
 */
export default function ScrollToTop({ label, title }: Props) {
  const show = useSyncExternalStore(subscribe, scrolled, () => false);

  const goTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "instant" : "smooth" });
  };

  return (
    <div
      className={cn(
        "fixed right-4 bottom-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.25rem))] z-40 origin-bottom-right transition-[opacity,transform,visibility] duration-200 ease-(--ease-standard) sm:right-6 sm:bottom-[max(1.75rem,calc(env(safe-area-inset-bottom)+0.25rem))] print:hidden",
        show ? "visible scale-100 opacity-100" : "invisible scale-50 opacity-0",
      )}
    >
      <Tooltip text={title} side="left">
        {(describedBy) => (
          <button
            type="button"
            aria-label={label}
            title={title}
            aria-describedby={describedBy}
            tabIndex={show ? 0 : -1}
            onClick={goTop}
            className="shadow-raised grid size-10 place-items-center rounded-full bg-paper text-blue transition-colors duration-(--duration-enter) hover:bg-blue-soft sm:size-12"
          >
            <ArrowUp aria-hidden="true" size={22} />
          </button>
        )}
      </Tooltip>
    </div>
  );
}
