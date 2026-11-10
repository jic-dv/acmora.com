"use client";

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/shared/lib/cn";

type Copy = {
  label: string;
  placeholder: string;
  title: string;
  clear: { label: string; title: string };
  prev: { label: string; title: string };
  next: { label: string; title: string };
  one: string;
  many: string;
  none: string;
};

type Entry = { el: HTMLDetailsElement; question: string; text: string };

const DEBOUNCE_MS = 180;

/** Minusculas y sin tildes: "mantencion" encuentra "mantención". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const smooth = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Buscador de preguntas frecuentes estilo Google: pastilla con lupa, sombra al enfocar y boton para borrar. Fijo bajo la
 * cabecera para que siga a la vista mientras la pagina baja sola hasta la respuesta. En cuanto hay coincidencia (todas las
 * palabras, sin importar tildes ni mayusculas) abre la mejor pregunta y se desplaza suavemente hasta ella; las demas
 * coincidencias quedan marcadas y se recorren con las flechas, Enter o Shift+Enter. Escape borra la busqueda.
 * Trabaja sobre los acordeones `details[data-faq]` que ya trae el servidor, asi la pagina funciona igual sin JavaScript.
 */
export default function FaqSearch({ copy }: { copy: Copy }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<{ total: number; index: number; query: string }>({ total: 0, index: 0, query: "" });
  const hits = useRef<Entry[]>([]);
  const lastTarget = useRef<HTMLDetailsElement | null>(null);
  const openedBySearch = useRef(new Set<HTMLDetailsElement>());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Enlace profundo desde el buscador global (/preguntas-frecuentes#faq-...): abre esa pregunta y la deja marcada.
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id.startsWith("faq-") ? document.getElementById(id) : null;
      if (!(el instanceof HTMLDetailsElement)) return;
      el.open = true;
      for (const other of document.querySelectorAll<HTMLDetailsElement>("details[data-faq]")) delete other.dataset.faqState;
      el.dataset.faqState = "current";
    };
    const frame = requestAnimationFrame(openFromHash);
    window.addEventListener("hashchange", openFromHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", openFromHash);
    };
  }, []);

  const paint = (current: number) => {
    for (const el of document.querySelectorAll<HTMLDetailsElement>("details[data-faq]")) delete el.dataset.faqState;
    hits.current.forEach((h, i) => {
      h.el.dataset.faqState = i === current ? "current" : "match";
    });
  };

  const reveal = (i: number) => {
    const target = hits.current[i];
    if (!target) return;
    paint(i);
    if (!target.el.open) {
      target.el.open = true;
      openedBySearch.current.add(target.el);
    }
    lastTarget.current = target.el;
    setStatus((s) => ({ ...s, index: i }));
    target.el.scrollIntoView({ behavior: smooth() ? "smooth" : "auto", block: "start" });
  };

  const clearMarks = () => {
    for (const el of document.querySelectorAll<HTMLDetailsElement>("details[data-faq]")) delete el.dataset.faqState;
    for (const el of openedBySearch.current) el.open = false;
    openedBySearch.current.clear();
    hits.current = [];
    lastTarget.current = null;
  };

  const run = (value: string) => {
    const words = fold(value).split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      clearMarks();
      setStatus({ total: 0, index: 0, query: "" });
      return;
    }
    const entries: Entry[] = Array.from(document.querySelectorAll<HTMLDetailsElement>("details[data-faq]")).map((el) => ({
      el,
      question: fold(el.querySelector("summary")?.textContent ?? ""),
      text: fold(el.textContent ?? ""),
    }));
    const found = entries.filter((e) => words.every((w) => e.text.includes(w)));
    // Primero las que traen todas las palabras en la pregunta; luego las que las tienen en la respuesta (orden de la pagina).
    const inQuestion = (e: Entry) => words.every((w) => e.question.includes(w));
    hits.current = [...found.filter(inQuestion), ...found.filter((e) => !inQuestion(e))];
    setStatus({ total: hits.current.length, index: 0, query: value.trim() });
    if (hits.current.length === 0) {
      paint(-1);
      lastTarget.current = null;
      return;
    }
    // Si al afinar la busqueda la mejor respuesta sigue siendo la misma, no se vuelve a desplazar la pagina.
    if (hits.current[0]?.el === lastTarget.current) paint(0);
    else reveal(0);
  };

  const onChange = (value: string) => {
    setQuery(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = undefined;
      run(value);
    }, DEBOUNCE_MS);
  };

  const step = (delta: number) => {
    if (hits.current.length < 2) return;
    reveal((status.index + delta + hits.current.length) % hits.current.length);
  };

  const clear = () => {
    clearTimeout(timer.current);
    setQuery("");
    run("");
    input.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Una busqueda pendiente se resuelve al instante; si ya hay resultados, Enter pasa al siguiente.
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = undefined;
        run(query);
      } else step(e.shiftKey ? -1 : 1);
    } else if (e.key === "Escape" && query) {
      e.preventDefault();
      clear();
    }
  };

  const iconButton = "grid size-10 shrink-0 place-items-center rounded-full text-ink-soft transition-colors duration-(--duration-enter) hover:bg-surface-strong disabled:opacity-40";
  const has = status.total > 0;
  const message = status.query
    ? has
      ? status.total === 1
        ? copy.one
        : copy.many.replace("{i}", String(status.index + 1)).replace("{n}", String(status.total))
      : copy.none.replace("{q}", status.query)
    : "";

  return (
    <div className="sticky top-16 z-30 -mx-4 -mb-3 -mt-4 bg-paper px-4 pb-2 pt-3 sm:-mx-6 sm:-mb-4 sm:px-6">
      <div
        role="search"
        className="flex h-14 items-center gap-1 rounded-pill border border-line bg-paper pl-5 pr-2 shadow-card transition-shadow duration-(--duration-enter) hover:shadow-raised focus-within:border-blue focus-within:shadow-raised"
      >
        <Search aria-hidden="true" size={22} className="shrink-0 text-ink-soft" />
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label={copy.label}
          title={copy.title}
          placeholder={copy.placeholder}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-lg text-ink outline-none placeholder:text-ink-soft focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        />
        {has && status.total > 1 ? (
          <>
            <button type="button" aria-label={copy.prev.label} title={copy.prev.title} onClick={() => step(-1)} className={iconButton}>
              <ChevronUp aria-hidden="true" size={22} />
            </button>
            <button type="button" aria-label={copy.next.label} title={copy.next.title} onClick={() => step(1)} className={iconButton}>
              <ChevronDown aria-hidden="true" size={22} />
            </button>
          </>
        ) : null}
        {query ? (
          <button type="button" aria-label={copy.clear.label} title={copy.clear.title} onClick={clear} className={iconButton}>
            <X aria-hidden="true" size={22} />
          </button>
        ) : null}
      </div>
      {/* Altura reservada para que el cuadro no salte cuando aparece el mensaje. */}
      <p role="status" aria-live="polite" className={cn("m-0 mt-1.5 min-h-6 px-5 text-sm", status.query && !has ? "text-del" : "text-ink-soft")}>
        {message}
      </p>
    </div>
  );
}
