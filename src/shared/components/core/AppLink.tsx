import NextLink from "next/link";
import type { ReactNode } from "react";

type Props = {
  href: string;
  /** Descripcion del destino. Obligatoria: nunca repite el texto visible. */
  title: string;
  children: ReactNode;
  className?: string;
};

export default function AppLink({ href, title, children, className }: Props) {
  if (href.startsWith("/")) {
    return (
      <NextLink href={href} title={title} className={className}>
        {children}
      </NextLink>
    );
  }
  const external = href.startsWith("https://");
  return (
    <a href={href} title={title} className={className} {...(external ? { rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}
