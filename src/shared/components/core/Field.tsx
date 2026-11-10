import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import ErrorIcon from "./ErrorIcon";

type Props = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /**
   * select: la etiqueta queda siempre arriba (el control siempre muestra un valor). text: sube al enfocar, al tener
   * contenido o al tener un error (el control debe llevar `peer` y placeholder=" ", ver `controlClass`).
   */
  kind?: "text" | "select";
  className?: string;
  children: (a11y: { id: string; "aria-describedby": string | undefined; "aria-invalid": boolean | undefined; placeholder?: string }) => ReactNode;
};

// Etiqueta arriba (sobre la linea del borde): en el control enfocado, con contenido o siempre (select).
const FLOATED = "[&>legend]:max-w-full";

/**
 * Campo de formulario como el de Google (crear cuenta): contorno de un solo borde (2 px azul al enfocar) y etiqueta que
 * descansa dentro del campo y, al enfocar o escribir, sube hasta la linea del borde superior, en azul y con el borde
 * interrumpido detras (el hueco lo abre el <legend> de un <fieldset>, asi el fondo y el borde quedan transparentes).
 * Texto de ayuda y error debajo, enlazados con aria-describedby. Etiqueta y contorno siguen al control en el DOM para
 * que `peer-*` los anime solo con CSS.
 */
export default function Field({ id, label, hint, error, required, kind = "text", className, children }: Props) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  // La etiqueta queda arriba siempre en los selectores y, en cualquier campo, mientras tenga un error de validacion
  // (con la misma animacion de subida que al enfocar o escribir).
  const floated = kind === "select" || Boolean(error);
  const text = (
    <>
      {label}
      {required ? " *" : null}
    </>
  );
  return (
    <div className={cn("grid content-start gap-1.5 [&_p]:mt-0", className)}>
      <div className="relative">
        {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined, ...(kind === "text" ? { placeholder: " " } : {}) })}
        {/* Icono de error dentro del campo (a la derecha, alineado con la primera linea), como en los formularios de Google. */}
        {error && kind !== "select" ? <ErrorIcon size={22} className="pointer-events-none absolute right-3 top-3 text-del" /> : null}
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute left-4 origin-left whitespace-nowrap text-[0.9375rem] leading-6 text-ink-soft transition-[top,transform,color] duration-150 ease-(--ease-standard)",
            "peer-aria-[invalid=true]:text-del!",
            floated
              ? "top-0 -translate-x-1 -translate-y-1/2 scale-75 text-blue"
              : [
                  "top-3",
                  "peer-focus:top-0 peer-focus:-translate-x-1 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:text-blue",
                  "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-x-1 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-blue",
                ],
          )}
        >
          {text}
        </label>
        <fieldset
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 -top-[5px] bottom-0 m-0 min-w-0 rounded-field border border-outline px-2 transition-colors duration-150",
            "peer-hover:border-ink peer-focus:border-2 peer-focus:border-blue",
            "peer-aria-[invalid=true]:border-2 peer-aria-[invalid=true]:border-del!",
            floated
              ? FLOATED
              : ["peer-focus:[&>legend]:max-w-full", "peer-[:not(:placeholder-shown)]:[&>legend]:max-w-full"],
          )}
        >
          <legend className="invisible block h-[11px] max-w-[0.01px] overflow-hidden whitespace-nowrap p-0 text-xs transition-[max-width] duration-100">
            <span className="inline-block px-1">{text}</span>
          </legend>
        </fieldset>
      </div>
      {hint ? (
        <p id={hintId} className="px-4 text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-2 px-4 text-xs font-medium text-del">
          <ErrorIcon size={16} className="mt-px" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
