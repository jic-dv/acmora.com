"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const TRICKLE_MS = 280;
const GIVE_UP_MS = 12_000;

/**
 * Barra de progreso superior de la navegacion, estilo Google (YouTube, Gmail): una linea azul de 3 px pegada al borde
 * de la ventana que avanza al pulsar un enlace interno y se completa y desaparece cuando llega la nueva pagina. El
 * App Router no expone eventos de navegacion, asi que el inicio se detecta con el clic en el enlace (o con atras y
 * adelante) y el final con el cambio de ruta. Se anima con transiciones de CSS escritas desde JS (CSSOM, permitido
 * por la CSP) sin re-renderizar, avanza por "goteo" hacia el 90% mientras espera y se retira sola si la navegacion no
 * llega. Respeta "reducir movimiento" gracias a la regla global de animaciones.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  const current = useRef(pathname);
  const timers = useRef<{ trickle?: ReturnType<typeof setInterval>; giveUp?: ReturnType<typeof setTimeout>; hide?: ReturnType<typeof setTimeout> }>({});
  const progress = useRef(0);
  const active = useRef(false);

  const set = (value: number, transition: string, opacity?: number) => {
    const el = bar.current;
    if (!el) return;
    el.style.transition = transition;
    el.style.transform = `scaleX(${value})`;
    if (opacity !== undefined) el.style.opacity = String(opacity);
  };

  const clear = () => {
    const t = timers.current;
    clearInterval(t.trickle);
    clearTimeout(t.giveUp);
    clearTimeout(t.hide);
  };

  const finish = () => {
    if (!active.current) return;
    active.current = false;
    clear();
    const el = bar.current;
    if (!el) return;
    el.dataset.state = "done";
    // Se completa, y despues se desvanece y se reinicia sin animacion.
    set(1, "transform 180ms ease-out");
    timers.current.hide = setTimeout(() => {
      if (!bar.current) return;
      bar.current.style.transition = "opacity 260ms ease-out";
      bar.current.style.opacity = "0";
      timers.current.hide = setTimeout(() => {
        set(0, "none");
        if (bar.current) bar.current.dataset.state = "idle";
      }, 280);
    }, 200);
  };

  const start = () => {
    const el = bar.current;
    if (!el) return;
    clear();
    active.current = true;
    progress.current = 0.12;
    el.dataset.state = "loading";
    set(0, "none", 1);
    // Fuerza un reflujo para que el salto inicial se aplique antes de animar.
    void el.offsetWidth;
    set(progress.current, "transform 300ms ease-out", 1);
    timers.current.trickle = setInterval(() => {
      progress.current += (0.9 - progress.current) * 0.1;
      set(progress.current, `transform ${TRICKLE_MS}ms linear`);
    }, TRICKLE_MS);
    timers.current.giveUp = setTimeout(finish, GIVE_UP_MS);
  };

  // Inicio: clic en un enlace interno hacia otra ruta, o botones atras y adelante.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Mismo destino o solo un ancla (#seccion): no hay carga.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    const onPop = () => {
      if (window.location.pathname !== current.current) start();
    };
    // En captura: el Link de Next llama a preventDefault() en su propio clic, y para entonces el evento ya esta marcado.
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      clear();
    };
    // start y clear solo usan refs: no dependen de renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fin: la ruta cambio, la pagina nueva ya esta.
  useEffect(() => {
    current.current = pathname;
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      ref={bar}
      aria-hidden="true"
      data-nav-progress=""
      data-state="idle"
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px] origin-left bg-blue opacity-0 shadow-[0_0_8px_var(--color-blue)] print:hidden"
    />
  );
}
