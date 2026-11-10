"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** El hash puede apuntar a un id del documento o a una pestana (`data-tab-id`), que se activa por hash sin tener ese id. */
function exists(id: string) {
  return document.getElementById(id) !== null || Array.from(document.querySelectorAll("[data-tab-id]")).some((el) => el.getAttribute("data-tab-id") === id);
}

/**
 * El servidor nunca recibe el hash (#...), asi que no puede responder 404 cuando apunta a algo inexistente
 * (/es/servicios#crm-dsferer). Este guardia lo comprueba en el cliente al cargar, al navegar y al cambiar el hash: si no hay
 * ningun elemento ni pestana con ese id, pasa a la ruta equivalente sin hash (/es/servicios/crm-dsferer), que el servidor
 * resuelve con el 404 localizado y el estado HTTP correcto. Los fragmentos de texto del navegador (#:~:text=) se ignoran.
 */
export default function HashGuard() {
  const pathname = usePathname();

  useEffect(() => {
    const check = () => {
      const raw = window.location.hash.slice(1);
      if (raw === "" || raw.startsWith(":~:")) return;
      let id = raw;
      try {
        id = decodeURIComponent(raw);
      } catch {
        // Un hash mal codificado tampoco apunta a nada: se trata como inexistente.
      }
      if (exists(id)) return;
      window.location.replace(`${pathname.replace(/\/$/, "")}/${encodeURIComponent(id)}`);
    };
    // Tras el pintado: la hidratacion y el cambio de ruta ya dejaron el contenido de la pagina en el DOM.
    const frame = requestAnimationFrame(check);
    window.addEventListener("hashchange", check);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", check);
    };
  }, [pathname]);

  return null;
}
