"use client";

import { ChevronDown } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import type { NavItem } from "./nav";

type Props = {
  items: NavItem[];
  label: string;
  orientation: "bar" | "stack";
  /** Texto y descripciones del item "Servicios", que abre el desplegable. */
  services: { label: string; href: string; openTitle: string; closeTitle: string; panelLabel: string };
  /** Contenido del desplegable, armado en servidor. */
  panel: ReactNode;
};

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * Navegacion principal. En barra: pestanas con subrayado y desplegable de servicios (patron de divulgacion: boton con
 * aria-expanded; Escape lo cierra y devuelve el foco). Con mouse tambien se abre al pasar el cursor por encima y se
 * cierra al salir (con una pausa breve); un clic lo deja fijo. Apilada: lista del menu movil con acordeon.
 */
export default function MainNav({ items, label, orientation, services, panel }: Props) {
  const pathname = usePathname();
  const bar = orientation === "bar";
  // Abierto solo para la ruta en que se abrio: al navegar se cierra sin efectos. `pinned`: lo fijo un clic o el teclado.
  const [state, setState] = useState<{ path: string; pinned: boolean } | null>(null);
  const open = state?.path === pathname;
  const pinned = open && state.pinned;
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearLeave = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
  }, []);
  const close = useCallback(() => {
    clearLeave();
    setState(null);
  }, [clearLeave]);
  useEffect(() => clearLeave, [clearLeave]);
  // Solo el mouse abre por hover: en tactil el puntero no "pasa por encima" y el menu se abre con el toque.
  const onEnter = (e: React.PointerEvent) => {
    if (!bar || e.pointerType !== "mouse") return;
    clearLeave();
    if (!open) setState({ path: pathname, pinned: false });
  };
  const onLeave = (e: React.PointerEvent) => {
    if (!bar || e.pointerType !== "mouse" || pinned) return;
    clearLeave();
    leaveTimer.current = setTimeout(() => setState(null), 150);
  };
  const navRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = `services-panel-${orientation}`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (bar && e.target instanceof Node && !navRef.current?.contains(e.target)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, bar, close]);

  const tabClass = (current: boolean, open = false) =>
    cn(
      "text-ink no-underline transition-colors duration-(--duration-enter) hover:text-blue",
      bar
        ? "relative flex h-full items-center gap-1 px-4 text-[0.9375rem] font-medium after:absolute after:inset-x-0 after:bottom-0 after:mx-auto after:w-1/2 after:h-[3px] after:rounded-t-full after:bg-transparent"
        : "flex min-h-12 w-full items-center justify-between gap-2 px-4 text-base font-medium hover:bg-surface",
      // Activo en barra: texto normal (blanco en oscuro) con subrayado azul; no vira a azul ni al pasar el cursor.
      // Abierto (desplegable) sin ser la ruta actual: solo subrayado, y el hover sigue pintando el texto de azul.
      (current || open) && (bar ? "after:bg-blue" : "bg-blue-soft text-blue"),
      current && bar && "hover:text-ink",
    );

  const servicesCurrent = isCurrent(pathname, services.href);

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className={bar ? "hidden h-full lg:block" : undefined}
      onBlur={(e) => {
        if (bar && open && e.relatedTarget instanceof Node && !e.currentTarget.contains(e.relatedTarget)) close();
      }}
    >
      <ul className={cn(bar ? "flex h-full items-stretch gap-1" : "grid border-t border-line")}>
        <li className={bar ? "flex" : "border-b border-line"} onPointerEnter={onEnter} onPointerLeave={onLeave}>
          <button
            ref={triggerRef}
            type="button"
            title={open ? services.closeTitle : services.openTitle}
            aria-expanded={open}
            aria-controls={panelId}
            aria-current={servicesCurrent ? "page" : undefined}
            onClick={() => (pinned ? close() : setState({ path: pathname, pinned: true }))}
            className={tabClass(servicesCurrent, open)}
          >
            {services.label}
            <ChevronDown aria-hidden="true" size={18} className={cn("transition-transform duration-(--duration-enter)", open && "rotate-180")} />
          </button>
          {/* El panel siempre esta en el HTML (los enlaces son rastreables); cerrado queda invisible y fuera del orden de tabulacion. */}
          <div
            id={panelId}
            role="group"
            aria-label={services.panelLabel}
            className={cn(
              "transition-[opacity,transform,visibility] duration-(--duration-enter) ease-(--ease-standard)",
              bar
                ? "absolute inset-x-0 top-full border-t border-line bg-paper shadow-raised"
                : "col-span-full grid transition-[grid-template-rows,opacity,visibility] duration-300",
              open
                ? bar
                  ? "visible translate-y-0 opacity-100"
                  : "visible grid-rows-[1fr] opacity-100"
                : bar
                  ? "invisible -translate-y-2 opacity-0"
                  : "invisible grid-rows-[0fr] opacity-0",
            )}
          >
            {/* En el cajon movil el submenu se pliega con una animacion suave de altura (filas de grilla de 0fr a 1fr). */}
            <div className={cn(bar ? "mx-auto w-full max-w-[75rem] px-4 py-8 sm:px-6" : "min-h-0 overflow-hidden")}>
              {bar ? panel : <div className="px-4 py-4">{panel}</div>}
            </div>
          </div>
        </li>
        {items.map((it) => {
          const current = isCurrent(pathname, it.href);
          return (
            <li key={it.id} className={bar ? "flex" : "border-b border-line"}>
              <NextLink href={it.href} title={it.title} aria-current={current ? "page" : undefined} className={tabClass(current)}>
                {it.label}
              </NextLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
