import { COMPANY } from "@/shared/constants/site";
import { cn } from "@/shared/lib/cn";

// Logotipo en SVG (1437 x 302). Variante clara para fondos claros, variante oscura (texto blanco) para fondos oscuros.
const LIGHT = COMPANY.logo.light;
const DARK = COMPANY.logo.dark;

type Props = {
  /** Atributo title de la imagen: descriptivo, distinto del alt y del title del enlace que la envuelve. */
  title: string;
  /** auto: sigue el tema del sitio. on-dark: siempre la variante para fondo oscuro (pie de pagina). */
  mode?: "auto" | "on-dark";
  height?: number;
  /** Clases extra para ambas variantes (por ejemplo, un alto menor en moviles). */
  className?: string;
};

export default function Logo({
  title,
  mode = "auto",
  height = 28,
  className,
}: Props) {
  const width = Math.round((height * 1437) / 302);
  if (mode === "on-dark") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- SVG estatico: next/image agrega un style en linea que la CSP bloquea.
      <img
        src={DARK}
        width={width}
        height={height}
        alt={COMPANY.name}
        title={title}
        decoding="async"
        data-no-ripple=""
        className={className}
      />
    );
  }
  // Las dos variantes llevan alt: la que se oculta por CSS (display: none) sale del arbol de accesibilidad.
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- idem */}
      <img
        src={LIGHT}
        width={width}
        height={height}
        alt={COMPANY.name}
        title={title}
        decoding="async"
        data-no-ripple=""
        className={cn("logo-light", className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- idem */}
      <img
        src={DARK}
        width={width}
        height={height}
        alt={COMPANY.name}
        title={title}
        decoding="async"
        data-no-ripple=""
        className={cn("logo-dark", className)}
      />
    </>
  );
}
