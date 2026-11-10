import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Botones en pastilla (referencia Google). primary/outline para superficies claras;
 * accent/outline-dark para superficies oscuras. Alto minimo de 44 px.
 */
export type ButtonVariant = "primary" | "outline" | "text" | "light" | "accent" | "outline-dark";
type Size = "md" | "lg";

export function buttonStyles({ variant = "primary", size = "md" }: { variant?: ButtonVariant; size?: Size } = {}) {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border-[1.6px] px-6 text-base font-medium no-underline",
    "transition-colors duration-(--duration-enter) ease-(--ease-standard)",
    "disabled:cursor-not-allowed disabled:opacity-60 aria-busy:cursor-progress",
    size === "lg" && "min-h-12 px-8 text-lg",
    variant === "primary" && "border-blue bg-blue text-on-blue hover:border-blue-hover hover:bg-blue-hover",
    // Sobre el hero azul: blanco fijo; al pasar el cursor, un blanco apenas mas opaco (igual en claro y oscuro, sin tomar el azul oscuro del tema).
    variant === "light" && "border-white bg-white text-brand hover:border-white/90 hover:bg-white/90",
    variant === "text" && "border-transparent bg-transparent text-blue hover:bg-blue-soft",
    variant === "outline" && "border-line-strong bg-paper text-blue hover:border-blue-light hover:bg-blue-soft",
    variant === "accent" && "border-brand bg-brand text-white hover:border-brand-light hover:bg-brand-light",
    variant === "outline-dark" && "border-night-soft bg-transparent text-white hover:border-white hover:bg-white/10",
  );
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Describe la accion completa. Obligatorio. */
  title: string;
  variant?: ButtonVariant;
  size?: Size;
  loading?: boolean;
};

export default function Button({ variant, size, loading, className, children, disabled, ...props }: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonStyles({ variant, size }), className)}
    >
      {children}
    </button>
  );
}
