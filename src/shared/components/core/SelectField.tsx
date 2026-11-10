"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { usePopupPosition } from "@/shared/lib/usePopupPosition";
import Field from "./Field";

type Option = { value: string; label: string };

type Props = {
  id: string;
  /** Nombre del campo oculto que viaja con el formulario. */
  name: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Texto del valor vacio ("") que se muestra mientras no hay seleccion. */
  placeholder: string;
  options: Option[];
  defaultValue?: string;
  className?: string;
  /** Se llama al elegir una opcion (el campo oculto cambia sin generar un evento del DOM). */
  onChange?: (value: string) => void;
};

const controlClass =
  "peer relative flex min-h-12 w-full items-center rounded-field border-0 bg-transparent px-4 py-3 pr-11 text-left text-[0.9375rem] text-ink outline-none focus-visible:outline-none";

/**
 * Selector desplegable estilo Google: cuadro con etiqueta flotante, flecha que gira 180 grados al abrir y cerrar (igual
 * que el desplegable de la navegacion) y lista con entrada suave. Patron ARIA de "select-only combobox": Enter, Espacio y
 * flechas abren; flechas, Inicio, Fin y letras mueven; Enter elige; Escape cierra solo la lista. El valor va en un campo
 * oculto, asi que el formulario no cambia.
 */
export default function SelectField({ id, name, label, hint, error, required, placeholder, options, defaultValue = "", className, onChange }: Props) {
  const listId = useId();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState(options.some((o) => o.value === defaultValue) ? defaultValue : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const all: Option[] = [{ value: "", label: placeholder }, ...options];
  const selected = all.find((o) => o.value === value) ?? all[0];
  const optionId = (i: number) => `${listId}-${i}`;

  const show = () => {
    setActive(Math.max(0, all.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const choose = (v: string) => {
    setValue(v);
    setOpen(false);
    onChange?.(v);
  };

  // La lista flota con posicion fija por encima del formulario: ningun contenedor con scroll la recorta.
  const listRef = usePopupPosition<HTMLUListElement>(anchorRef, open);

  // Mantiene a la vista la opcion resaltada.
  useEffect(() => {
    if (!open) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- optionId depende solo de listId
  }, [active, open]);

  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} kind="select" className={className}>
      {(a11y) => (
        <>
          <input type="hidden" name={name} value={value} />
          <button
            {...a11y}
            ref={anchorRef}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-required={required || undefined}
            aria-activedescendant={open ? optionId(active) : undefined}
            onClick={() => (open ? setOpen(false) : show())}
            onBlur={() => setOpen(false)}
            onKeyDown={(e) => {
              const n = all.length;
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                if (!open) show();
                else setActive((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n));
              } else if (e.key === "Home" || e.key === "End") {
                if (open) {
                  e.preventDefault();
                  setActive(e.key === "Home" ? 0 : n - 1);
                }
              } else if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!open) show();
                else choose(all[active]?.value ?? "");
              } else if (e.key === "Escape" && open) {
                // Cierra solo la lista: sin esto, Escape tambien cerraria el dialogo que contiene el campo.
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              } else if (e.key.length === 1 && /\S/.test(e.key)) {
                // Busqueda por letra: salta a la primera opcion que empieza con ella.
                const k = e.key.toLowerCase();
                const i = all.findIndex((o, idx) => idx > 0 && o.label.toLowerCase().startsWith(k));
                if (i >= 0) {
                  if (!open) show();
                  setActive(i);
                }
              }
            }}
            className={controlClass}
          >
            <span className={cn("block truncate", value === "" && "text-ink-soft")}>{selected?.label}</span>
            <ChevronDown aria-hidden="true" size={20} className={cn("pointer-events-none absolute right-3 top-1/2 -mt-2.5 text-ink-soft transition-transform duration-(--duration-enter) ease-(--ease-standard)", open && "rotate-180")} />
          </button>
          {open ? (
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={label}
              // Pulsar la barra de desplazamiento (o el borde de la lista) no debe quitar el foco al boton: cerraria la lista.
              onMouseDown={(e) => e.preventDefault()}
              className="listbox-in fixed z-[100] m-0 overflow-y-auto overscroll-contain rounded-card bg-paper py-1 shadow-raised ring-1 ring-line"
            >
              {all.map((o, i) => (
                <li
                  key={o.value || "empty"}
                  id={optionId(i)}
                  role="option"
                  aria-selected={o.value === value}
                  // El clic no debe quitar el foco al boton antes de elegir.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o.value)}
                  onMouseMove={() => active !== i && setActive(i)}
                  className={cn("flex cursor-pointer items-center px-4 py-2.5 text-[0.9375rem]", i === active && "bg-blue-soft", o.value === value && "font-medium", o.value === "" && "text-ink-soft")}
                >
                  {o.label}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </Field>
  );
}
