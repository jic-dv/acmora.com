"use client";

import { useEffect } from "react";

const TARGETS = "a[href], button, summary, [data-ripple]";

/**
 * Onda de Material al hacer clic o tocar botones, enlaces y resumenes. Delegacion de eventos en document:
 * un solo listener, sin estado ni re-render. Respeta prefers-reduced-motion y se omite en controles deshabilitados.
 */
export default function Ripple() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    const onDown = (e: PointerEvent) => {
      if (reduce.matches || e.button !== 0 || !(e.target instanceof Element)) return;
      const el = e.target.closest<HTMLElement>(TARGETS);
      // data-no-ripple en el control o en el elemento pulsado (por ejemplo, el logotipo dentro de su enlace) omite la onda.
      if (!el || el.matches(":disabled, [aria-disabled='true'], [data-no-ripple]") || e.target.closest("[data-no-ripple]")) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Diametro que cubre el elemento desde el punto de clic hasta la esquina mas lejana.
      const size = 2 * Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));

      const host = document.createElement("span");
      host.className = "ripple-host";
      host.setAttribute("aria-hidden", "true");
      const wave = document.createElement("span");
      wave.className = "ripple";
      wave.style.width = wave.style.height = `${size}px`;
      wave.style.left = `${x - size / 2}px`;
      wave.style.top = `${y - size / 2}px`;
      host.append(wave);
      el.append(host);
      wave.addEventListener("animationend", () => host.remove(), { once: true });
    };

    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  return null;
}
