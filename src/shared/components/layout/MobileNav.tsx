"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  openLabel: string;
  openTitle: string;
  closeLabel: string;
  closeTitle: string;
  /** Logotipo (enlace al inicio) que se muestra arriba a la izquierda del cajon. */
  logo: ReactNode;
  /** Contenido del panel (navegacion apilada y boton de contacto), armado en servidor. */
  children: ReactNode;
};

/**
 * Menu movil como cajon lateral modal (patron "navigation drawer" de Material): entra desde la derecha ocupando el
 * 80% de la pantalla en moviles y, desde tablet, como maximo el 40%, con esquinas rectas (con un minimo legible) sobre un velo que aparece en fundido, y sale con la animacion inversa mas
 * corta. Usa <dialog> nativo: trampa de foco, Escape y contenido inerte fuera del cajon los resuelve el navegador.
 * El idioma y el tema viven en la cabecera, no aqui. Al navegar el cajon se cierra al instante.
 */
export default function MobileNav({ openLabel, openTitle, closeLabel, closeTitle, logo, children }: Props) {
  const pathname = usePathname();
  // Abierto solo para la ruta en que se abrio: al navegar se cierra sin efectos. `closing` marca la salida animada.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [closingFor, setClosingFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const closing = open && closingFor === pathname;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Al montar el <dialog> se abre como modal (entra con la animacion de CSS).
  useEffect(() => {
    if (open && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [open]);

  const requestClose = () => setClosingFor(pathname);
  const finishClose = () => {
    setOpenFor(null);
    setClosingFor(null);
  };

  // Al cerrarse el cajon (por cualquier via) el foco vuelve al boton del menu. Se hace tras desmontar: con el modal abierto el resto de la pagina es inerte.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) buttonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  // Si la pantalla crece hasta mostrar la barra completa, el cajon ya no corresponde: se cierra.
  useEffect(() => {
    if (!open) return;
    const wide = window.matchMedia("(min-width: 64rem)");
    const onChange = () => {
      if (wide.matches) setOpenFor(null);
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        title={openTitle}
        aria-label={openLabel}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => {
          setClosingFor(null);
          setOpenFor(pathname);
        }}
        className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface"
      >
        <Menu aria-hidden="true" size={24} />
      </button>
      {open ? (
        <dialog
          ref={dialogRef}
          id="mobile-nav"
          aria-label={openLabel}
          data-closing={closing ? "" : undefined}
          // Escape: se anima la salida en vez de cerrar de golpe.
          onCancel={(e) => {
            e.preventDefault();
            requestClose();
          }}
          // Un clic sobre el velo (el propio <dialog>, que no tiene relleno) o sobre un enlace cierra el cajon.
          onClick={(e) => {
            if (e.target === dialogRef.current || (e.target instanceof Element && e.target.closest("a[href]"))) requestClose();
          }}
          onAnimationEnd={(e) => {
            if (closing && e.target === e.currentTarget) finishClose();
          }}
          className="g-drawer fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[80%] min-w-64 overflow-y-auto md:w-[40%] bg-paper p-0 text-ink shadow-raised"
        >
          {/* Sin margen lateral: los items de navegacion y sus separadores llegan hasta el borde del cajon; el relleno va dentro de cada pieza. */}
          <div className="flex min-h-full flex-col pb-4 pt-2">
            <div className="mb-2 flex h-14 items-center justify-between px-4">
              {logo}
              <button type="button" title={closeTitle} aria-label={closeLabel} onClick={requestClose} className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface">
                <X aria-hidden="true" size={24} />
              </button>
            </div>
            {children}
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
