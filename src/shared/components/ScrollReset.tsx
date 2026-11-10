"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Cada navegacion entre paginas arranca desde el tope, con salto inmediato (sin animacion de scroll).
 * Se respetan los casos en que el navegador ya sabe donde ir: enlaces con ancla (#seccion) y los botones
 * atras/adelante, que restauran la posicion anterior. Ademas se ignora la primera carga (recarga con scroll guardado).
 */
export default function ScrollReset() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const fromHistory = useRef(false);

  useEffect(() => {
    const onPop = () => {
      fromHistory.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
