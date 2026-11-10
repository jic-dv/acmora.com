"use client";

import {
  CL, AR, BO, BR, CO, EC, PY, PE, UY, VE, MX, CR, PA, GT, SV, HN, NI, CU, US, ES, PT, GB, IE, FR, DE, IT, NL, CH, TR, IL, AE, ZA, CN, JP, KR, IN, SG, PH, AU, NZ,
} from "country-flag-icons/react/3x2";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/i18n/routing";
import Field from "@/shared/components/core/Field";
import { cn } from "@/shared/lib/cn";
import { usePopupPosition } from "@/shared/lib/usePopupPosition";
import { COUNTRIES } from "../state";
import { controlClass } from "./controls";

const FLAGS = { CL, AR, BO, BR, CO, EC, PY, PE, UY, VE, MX, CR, PA, GT, SV, HN, NI, CU, US, ES, PT, GB, IE, FR, DE, IT, NL, CH, TR, IL, AE, ZA, CN, JP, KR, IN, SG, PH, AU, NZ } as const;
type Iso = keyof typeof FLAGS;

/** Minusculas, sin tildes, sin "+" ni espacios: "+56", "56", "Perú" y "peru" se comparan en igualdad de condiciones. */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[+\s]/g, "");

function Flag({ iso, className }: { iso: string; className?: string }) {
  const Icon = FLAGS[iso as Iso];
  return Icon ? <Icon aria-hidden="true" focusable="false" className={cn("h-4 w-6 shrink-0 rounded-[2px] ring-1 ring-line", className)} /> : null;
}

type Props = {
  id: string;
  /** Nombre del campo oculto que viaja con el formulario (el prefijo elegido, por ejemplo "+56"). */
  name: string;
  label: string;
  empty: string;
  locale: Locale;
  defaultValue: string;
  /** Se llama al elegir un prefijo (el campo oculto cambia sin generar un evento del DOM). */
  onChange?: (code: string) => void;
};

/**
 * Selector de codigo de pais con banderas y busqueda: se escribe el numero ("56"), el codigo ISO ("cl") o el nombre
 * ("per") y la lista se filtra. Patron ARIA de combobox editable con lista: flechas, Enter, Escape y clic. El valor
 * elegido va en un campo oculto; la etiqueta flotante y el contorno vienen de `Field`.
 */
export default function CountryField({ id, name, label, empty, locale, defaultValue, onChange }: Props) {
  const listId = useId();
  const anchorRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(COUNTRIES.some((c) => c.code === defaultValue) ? defaultValue : "+56");
  // null: sin editar (se muestra el prefijo elegido); texto: lo que la persona escribe para buscar.
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selected = COUNTRIES.find((c) => c.code === value) ?? COUNTRIES[0];
  const q = norm(query ?? "");
  const matches = q === "" ? COUNTRIES : COUNTRIES.filter((c) => norm(c.name[locale]).includes(q) || norm(c.name.es).includes(q) || c.iso.toLowerCase().startsWith(q) || norm(c.code).startsWith(q));
  const optionId = (i: number) => `${listId}-${i}`;

  // La lista flota con posicion fija por encima del formulario: ningun contenedor con scroll la recorta.
  const listRef = usePopupPosition<HTMLUListElement>(anchorRef, open, 256);

  // Mantiene a la vista la opcion resaltada al moverse con el teclado.
  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- optionId depende solo de listId
  }, [active, open]);

  // Al abrir, la lista llega con el pais elegido centrado (en vez de empezar siempre arriba). Se mueve solo el scroll de la lista.
  useEffect(() => {
    const list = listRef.current;
    const el = open ? document.getElementById(optionId(Math.max(0, COUNTRIES.findIndex((c) => c.code === value)))) : null;
    if (list && el) list.scrollTop = el.offsetTop - (list.clientHeight - el.offsetHeight) / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [open]);

  const openList = () => {
    setActive(Math.max(0, COUNTRIES.findIndex((c) => c.code === value)));
    setOpen(true);
  };

  const choose = (code: string) => {
    setValue(code);
    setQuery(null);
    setOpen(false);
    onChange?.(code);
  };

  return (
    <Field id={id} label={label} kind="select">
      {(a11y) => (
        <>
          <input type="hidden" name={name} value={value} />
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <Flag iso={selected?.iso ?? "CL"} />
          </span>
          <input
            {...a11y}
            ref={anchorRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && matches[active] ? optionId(active) : undefined}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={query ?? selected?.code ?? ""}
            onFocus={(e) => {
              e.currentTarget.select();
              openList();
            }}
            onClick={() => !open && openList()}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onBlur={() => {
              setOpen(false);
              setQuery(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setOpen(true);
                const n = matches.length;
                if (n > 0) setActive((i) => (e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n));
              } else if (e.key === "Enter" && open) {
                e.preventDefault();
                const m = matches[active];
                if (m) choose(m.code);
              } else if (e.key === "Escape" && open) {
                // Cierra solo la lista: sin esto, Escape tambien cerraria el dialogo que contiene el campo.
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                setQuery(null);
              }
            }}
            className={cn(controlClass, "pl-12 pr-9")}
          />
          <ChevronDown aria-hidden="true" size={18} className={cn("pointer-events-none absolute right-2.5 top-1/2 -mt-[9px] text-ink-soft transition-transform duration-(--duration-enter) ease-(--ease-standard)", open && "rotate-180")} />
          {open ? (
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={label}
              // Pulsar la barra de desplazamiento (o el borde de la lista) no debe quitar el foco al campo: cerraria la lista.
              onMouseDown={(e) => e.preventDefault()}
              className="listbox-in quote-scroll fixed z-[100] m-0 overflow-y-auto overscroll-contain rounded-card bg-paper py-1.5 pl-1.5 pr-0.5 shadow-raised ring-1 ring-line"
            >
              {matches.length === 0 ? (
                <li role="presentation" className="px-4 py-3 text-sm text-ink-soft">
                  {empty}
                </li>
              ) : (
                matches.map((c, i) => (
                  <li
                    key={c.iso}
                    id={optionId(i)}
                    role="option"
                    aria-selected={c.code === value}
                    // El clic no debe quitar el foco al campo antes de elegir.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(c.code)}
                    onMouseMove={() => active !== i && setActive(i)}
                    className={cn("flex cursor-pointer items-center gap-3 rounded-[10px] py-2 pl-2 pr-3 text-[0.9375rem]", i === active && "bg-blue-soft", c.code === value && "font-medium")}
                  >
                    <Flag iso={c.iso} />
                    <span className="flex-1 truncate">{c.name[locale]}</span>
                    <span className="text-ink-soft tabular-nums">{c.code}</span>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </>
      )}
    </Field>
  );
}
