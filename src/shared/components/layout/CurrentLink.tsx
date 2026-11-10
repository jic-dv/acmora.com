"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Enlace de navegacion que se marca como pagina actual (aria-current="page") cuando la ruta coincide. El contenido
 * llega ya armado desde el servidor; solo este componente conoce la ruta, asi el desplegable de servicios sigue siendo
 * de servidor. Los estilos de "activo" se declaran con variantes `aria-[current=page]:` en quien lo usa.
 */
export default function CurrentLink({ href, title, className, children }: { href: string; title: string; className?: string; children: ReactNode }) {
  const current = usePathname() === href;
  return (
    <NextLink href={href} title={title} aria-current={current ? "page" : undefined} className={className}>
      {children}
    </NextLink>
  );
}
