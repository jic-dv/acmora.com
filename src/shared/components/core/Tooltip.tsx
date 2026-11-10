"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type Props = {
  text: string;
  /** Recibe el id del tooltip para enlazarlo con aria-describedby del control. */
  children: (describedBy: string) => ReactNode;
  /** Alineacion del globo bajo el control. `end` lo ancla al borde derecho (controles pegados al borde de la pantalla). */
  align?: "center" | "end";
  /** Lado del control donde aparece el globo. `left` sirve para controles fijos en el borde derecho. */
  side?: "bottom" | "left";
  className?: string;
};

/**
 * Tooltip estilo Google: globo oscuro compacto bajo el control, con una pausa corta al pasar el mouse y sin pausa con
 * el foco de teclado. Cumple WCAG 1.4.13: se cierra con Escape (aunque solo haya hover), se puede recorrer con el
 * puntero sin que desaparezca (el globo es hijo del anfitrion y no hay hueco entre ambos) y permanece mientras haya
 * foco o hover. Solo CSS salvo el cierre con Escape. Reemplaza al `title` nativo del control para no mostrar dos globos.
 */
export default function Tooltip({ text, children, align = "center", side = "bottom", className }: Props) {
  const id = useId();
  const [active, setActive] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDismissed(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  const host = useRef<HTMLSpanElement>(null);

  // El control lleva su `title` (descriptivo, para herramientas y lectores); mientras este el globo propio, el globo nativo se
  // retira para no mostrar dos, y se restituye al salir.
  const stashTitle = () => {
    const control = host.current?.firstElementChild;
    const title = control?.getAttribute("title");
    if (control && title) {
      control.setAttribute("data-title", title);
      control.removeAttribute("title");
    }
  };
  const restoreTitle = () => {
    const control = host.current?.firstElementChild;
    const title = control?.getAttribute("data-title");
    if (control && title) {
      control.setAttribute("title", title);
      control.removeAttribute("data-title");
    }
  };

  const enter = () => {
    stashTitle();
    setActive(true);
  };
  const leave = () => {
    restoreTitle();
    setActive(false);
    setDismissed(false);
  };

  return (
    <span ref={host} className={cn("group/tip relative inline-flex", className)} onPointerEnter={enter} onPointerLeave={leave} onFocus={enter} onBlur={leave}>
      {children(id)}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none invisible absolute z-[60] opacity-0 transition-[opacity,visibility] duration-100",
          side === "left" ? "right-full top-1/2 -translate-y-1/2 pr-2" : cn("top-full pt-2", align === "end" ? "right-0" : "left-1/2 -translate-x-1/2"),
          "group-hover/tip:pointer-events-auto group-hover/tip:visible group-hover/tip:opacity-100 group-hover/tip:delay-500",
          "group-has-[:focus-visible]/tip:visible group-has-[:focus-visible]/tip:opacity-100",
          dismissed && "!invisible !opacity-0",
        )}
      >
        <span className="block whitespace-nowrap rounded-md bg-tip px-2.5 py-1.5 text-xs font-medium leading-4 text-on-tip">{text}</span>
      </span>
    </span>
  );
}
