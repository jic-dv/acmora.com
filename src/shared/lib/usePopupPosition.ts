import { useLayoutEffect, useRef, type RefObject } from "react";

const GAP = 4;
const MARGIN = 8;
const MAX_HEIGHT = 240;

/**
 * Coloca una lista desplegable con `position: fixed` junto a su campo: queda por encima del contenedor del formulario
 * (que tiene scroll propio y recortaria una lista absoluta) y se abre hacia arriba si abajo no cabe. Devuelve la ref
 * que debe llevar la lista; escribe los estilos directamente en el elemento (sin estado, sin re-renderizar) y los
 * recalcula al hacer scroll o cambiar el tamano. `width`: "anchor" iguala el ancho del campo; un numero fija el ancho en px.
 */
export function usePopupPosition<T extends HTMLElement>(anchor: RefObject<HTMLElement | null>, open: boolean, width: "anchor" | number = "anchor") {
  const list = useRef<T>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current;
      const l = list.current;
      if (!a || !l) return;
      const r = a.getBoundingClientRect();
      const w = width === "anchor" ? r.width : width;
      const below = window.innerHeight - r.bottom - MARGIN - GAP;
      const above = r.top - MARGIN - GAP;
      const down = below >= Math.min(MAX_HEIGHT, 180) || below >= above;
      const left = Math.max(MARGIN, Math.min(r.left, window.innerWidth - w - MARGIN));
      l.style.left = `${left}px`;
      l.style.width = `${w}px`;
      l.style.maxHeight = `${Math.max(96, Math.min(MAX_HEIGHT, down ? below : above))}px`;
      if (down) {
        l.style.top = `${r.bottom + GAP}px`;
        l.style.bottom = "auto";
      } else {
        l.style.bottom = `${window.innerHeight - r.top + GAP}px`;
        l.style.top = "auto";
      }
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchor, open, width]);
  return list;
}
