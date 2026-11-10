import { cn } from "@/shared/lib/cn";

/**
 * Icono de error de los campos, como el de Google (Material "error"): circulo relleno con signo de exclamacion. Toma el color
 * del texto (`text-del` en los errores) y es solo decorativo: el mensaje de error ya lo lee el lector de pantalla.
 */
export default function ErrorIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width={size} height={size} className={cn("shrink-0", className)}>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <rect x="11" y="6.5" width="2" height="7" rx="1" fill="var(--color-paper)" />
      <circle cx="12" cy="16.7" r="1.2" fill="var(--color-paper)" />
    </svg>
  );
}
