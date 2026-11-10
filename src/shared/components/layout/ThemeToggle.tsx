"use client";

import { Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useSyncExternalStore } from "react";
import Tooltip from "@/shared/components/core/Tooltip";
import { currentTheme, syncTheme } from "@/shared/lib/theme";

type Props = { toLight: { label: string; title: string }; toDark: { label: string; title: string } };

const subscribe = (notify: () => void) => {
  // Se reacciona al atributo de <html> y a cambios hechos en otra pestana (el sistema ya no interviene: el defecto es claro).
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.addEventListener("storage", notify);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", notify);
  };
};

/**
 * Boton de tema claro/oscuro. El cambio de tema lo hace el script de <head> (app/[locale]/layout.tsx) al detectar el
 * clic en [data-theme-toggle]: asi funciona incluso antes de hidratar y tras recrearse <html>. Este componente solo
 * refleja el estado (icono y texto) y restituye el atributo en cada montaje y navegacion.
 */
export default function ThemeToggle({ toLight, toDark }: Props) {
  const pathname = usePathname();
  const dark = useSyncExternalStore(subscribe, () => currentTheme() === "dark", () => false);
  const next = dark ? toLight : toDark;

  // Antes de pintar: si <html> se recreo (cambio de idioma) vuelve a poner el tema guardado.
  useLayoutEffect(() => {
    syncTheme();
  }, [pathname]);

  return (
    <Tooltip text={next.title} align="end">
      {(describedBy) => (
        <button
          type="button"
          data-theme-toggle=""
          aria-label={next.label}
          title={next.title}
          aria-describedby={describedBy}
          className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface"
        >
          {/* Iconos solidos: relleno con el color del texto (oscuro en tema claro). */}
          {dark ? <Sun aria-hidden="true" size={22} fill="currentColor" /> : <Moon aria-hidden="true" size={22} fill="currentColor" />}
        </button>
      )}
    </Tooltip>
  );
}
