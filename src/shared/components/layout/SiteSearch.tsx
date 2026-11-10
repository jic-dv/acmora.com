"use client";

import { ArrowRight, CircleQuestionMark, FileText, Hash, MessageCircle, Search, X } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import ErrorIcon from "@/shared/components/core/ErrorIcon";
import Tooltip from "@/shared/components/core/Tooltip";
import { whatsappLink } from "@/shared/constants/site";
import { cn } from "@/shared/lib/cn";
import { excerpt, highlight, prepare, search, suggest, type Hit, type Indexed } from "@/shared/lib/search";

type Action = { label: string; title: string };
type Copy = {
  open: Action;
  pill: string;
  dialog: string;
  input: { label: string; placeholder: string; title: string };
  clear: Action;
  close: Action;
  kinds: Record<"page" | "service" | "section" | "faq", string>;
  popular: { heading: string; items: { label: string; query: string }[]; title: string };
  shortcuts: string;
  results: { one: string; many: string; partial: string; linkTitle: string };
  loading: string;
  error: { heading: string; text: string; retry: Action };
  empty: {
    heading: string;
    tipsHeading: string;
    tips: string[];
    didYouMean: string;
    didYouMeanTitle: string;
    contact: { text: string; label: string; title: string; message: string };
  };
};
export type SearchShortcut = { label: string; title: string; href: string };

type Status = "idle" | "loading" | "ready" | "error";

// El indice se descarga una vez por idioma y queda en memoria mientras dure la visita.
const loaded = new Map<string, Indexed[]>();

const ICON = { page: FileText, section: Hash, faq: CircleQuestionMark } as const;

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

function Marked({ text, words }: { text: string; words: string[] }) {
  return (
    <>
      {highlight(text, words).map((p, i) =>
        p.hit ? (
          <mark key={i} className="bg-transparent font-semibold text-ink">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/**
 * Buscador global estilo Google. En la cabecera: pastilla "Buscar en el sitio" en pantallas anchas e icono en las demas. Se abre en un
 * dialogo modal (clic, "/" o Ctrl/Cmd+K) con una barra de busqueda en pastilla y los resultados debajo: icono por tipo, titulo y
 * pagina de origen, y un extracto con las palabras buscadas en negrita. Sin resultados no se queda mudo: sugiere una correccion
 * ("Quizas quisiste decir"), consejos, atajos a las paginas principales y WhatsApp con la busqueda ya escrita. Un fallo de red
 * muestra el error con el icono de Google y un boton para reintentar. El indice sale de `/api/search/{idioma}` y se pide al abrir.
 */
export default function SiteSearch({ locale, copy, shortcuts }: { locale: string; copy: Copy; shortcuts: SearchShortcut[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>(() => (loaded.has(locale) ? "ready" : "idle"));
  const [index, setIndex] = useState<Indexed[]>(() => loaded.get(locale) ?? []);

  const load = useCallback(() => {
    if (loaded.has(locale)) {
      setIndex(loaded.get(locale) ?? []);
      setStatus("ready");
      return;
    }
    setStatus("loading");
    fetch(`/api/search/${locale}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: unknown) => {
        // El esquema (Zod) se descarga recien aqui: no pesa en la carga de cada pagina.
        return import("@/shared/lib/search-schema").then(({ indexSchema }) => {
          const prepared = prepare(indexSchema.parse(json));
          loaded.set(locale, prepared);
          setIndex(prepared);
          setStatus("ready");
        });
      })
      .catch(() => setStatus("error"));
  }, [locale]);

  const show = useCallback(() => {
    const d = dialog.current;
    if (!d || d.open) return;
    d.showModal();
    setOpen(true);
    load();
  }, [load]);

  // Tras navegar a otra ruta el dialogo se cierra (los enlaces con solo #ancla lo cierran con su clic).
  const pathname = usePathname();
  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      const slash = e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target);
      const combo = e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey);
      if (!slash && !combo) return;
      e.preventDefault();
      show();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show]);

  return (
    <>
      <Tooltip text={copy.open.title}>
        {(describedBy) => (
          <button
            type="button"
            aria-label={copy.open.label}
            title={copy.open.title}
            aria-describedby={describedBy}
            aria-haspopup="dialog"
            onClick={show}
            className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface xl:hidden"
          >
            <Search aria-hidden="true" size={22} />
          </button>
        )}
      </Tooltip>
      <button
        type="button"
        title={copy.open.title}
        aria-haspopup="dialog"
        onClick={show}
        className="hidden h-11 items-center gap-2.5 rounded-pill bg-surface pl-4 pr-3 text-[0.9375rem] text-ink-soft transition-shadow duration-(--duration-enter) hover:shadow-card xl:inline-flex"
      >
        <Search aria-hidden="true" size={20} />
        {copy.pill}
        <kbd aria-hidden="true" className="ml-3 rounded-md border border-line bg-paper px-1.5 font-mono text-xs leading-5">
          /
        </kbd>
      </button>

      <dialog
        ref={dialog}
        aria-label={copy.dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Un clic en el velo (el propio <dialog>, fuera del panel) lo cierra.
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="g-dialog fixed inset-x-0 top-0 m-0 mx-auto mt-2 w-[min(46rem,calc(100%-1rem))] max-w-none overflow-hidden rounded-[28px] border-0 bg-paper p-0 text-ink shadow-raised sm:mt-[min(9vh,5rem)]"
      >
        {open ? <Panel copy={copy} shortcuts={shortcuts} status={status} index={index} reload={load} close={() => dialog.current?.close()} /> : null}
      </dialog>
    </>
  );
}

function Panel({
  copy,
  shortcuts,
  status,
  index,
  reload,
  close,
}: {
  copy: Copy;
  shortcuts: SearchShortcut[];
  status: Status;
  index: Indexed[];
  reload: () => void;
  close: () => void;
}) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    input.current?.focus();
  }, []);

  const found = useMemo(() => (status === "ready" ? search(index, query) : null), [status, index, query]);
  const typed = query.trim().length > 0;
  const fix = useMemo(() => (found && typed && found.hits.length === 0 ? suggest(index, query) : null), [found, typed, index, query]);

  const links = () => Array.from(list.current?.querySelectorAll<HTMLAnchorElement>("a[data-result]") ?? []);
  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      // En un campo de busqueda, Esc borra el texto y no llega al dialogo: aqui cierra el buscador directamente.
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      links()[0]?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      links()[0]?.click();
    }
  };
  const onLinkKey = (e: KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const all = links();
    const at = all.indexOf(e.currentTarget);
    const next = all[at + (e.key === "ArrowDown" ? 1 : -1)];
    if (next) next.focus();
    else if (e.key === "ArrowUp") input.current?.focus();
  };

  const count = found ? (found.hits.length === 1 ? copy.results.one : copy.results.many.replace("{n}", String(found.hits.length))) : "";
  const live = status === "loading" ? copy.loading : status === "error" ? copy.error.heading : typed && found ? (found.hits.length > 0 ? count : copy.empty.heading.replace("{q}", query.trim())) : "";
  const iconButton = "grid size-10 shrink-0 place-items-center rounded-full text-ink-soft transition-colors duration-(--duration-enter) hover:bg-surface-strong";

  const shortcutLinks = (
    <div>
      <p className="m-0 px-1 text-sm font-medium text-ink-soft">{copy.shortcuts}</p>
      <ul className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
        {shortcuts.map((s) => (
          <li key={s.href} className="m-0">
            <NextLink
              href={s.href}
              title={s.title}
              onClick={close}
              className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-line px-4 text-[0.9375rem] text-ink no-underline hover:bg-surface"
            >
              {s.label}
              <ArrowRight aria-hidden="true" size={16} className="text-ink-soft" />
            </NextLink>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="flex max-h-[calc(100dvh-1rem)] flex-col sm:max-h-[min(40rem,calc(100dvh-6rem))]">
      <div className="flex items-center gap-1 p-3 pb-2 sm:p-4 sm:pb-2">
        <div role="search" className="flex h-14 min-w-0 flex-1 items-center gap-1 rounded-pill bg-surface pl-5 pr-1.5 transition-shadow duration-(--duration-enter) focus-within:bg-paper focus-within:shadow-raised">
          <Search aria-hidden="true" size={22} className="shrink-0 text-ink-soft" />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            aria-label={copy.input.label}
            aria-controls={listId}
            title={copy.input.title}
            placeholder={copy.input.placeholder}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-lg text-ink outline-none placeholder:text-ink-soft focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
          {query ? (
            <button
              type="button"
              aria-label={copy.clear.label}
              title={copy.clear.title}
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
              className={iconButton}
            >
              <X aria-hidden="true" size={22} />
            </button>
          ) : null}
        </div>
        <button type="button" aria-label={copy.close.label} title={copy.close.title} onClick={close} className={cn(iconButton, "size-11")}>
          <X aria-hidden="true" size={24} />
        </button>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {live}
      </p>

      <div ref={list} id={listId} className="quote-scroll min-h-0 flex-1 mb-3 overflow-y-auto overscroll-contain px-3 sm:mb-4 sm:px-4">
        {status === "loading" || status === "idle" ? (
          <div className="grid gap-3 px-1 py-4" aria-hidden="true">
            <div className="h-1 overflow-hidden rounded-pill bg-blue-soft">
              <div className="search-bar h-full w-1/3 rounded-pill bg-blue" />
            </div>
            <p className="m-0 text-sm text-ink-soft">{copy.loading}</p>
          </div>
        ) : status === "error" ? (
          <div className="grid justify-items-start gap-3 px-1 py-6">
            <div className="flex items-center gap-3">
              <ErrorIcon size={28} className="text-del" />
              <p className="m-0 text-lg font-medium">{copy.error.heading}</p>
            </div>
            <p className="m-0 text-ink-soft">{copy.error.text}</p>
            <button
              type="button"
              title={copy.error.retry.title}
              onClick={reload}
              className="inline-flex h-10 items-center rounded-pill border border-line px-5 font-medium text-blue hover:bg-blue-soft"
            >
              {copy.error.retry.label}
            </button>
          </div>
        ) : !typed ? (
          <div className="grid gap-6 px-1 py-3">
            <div>
              <p className="m-0 text-sm font-medium text-ink-soft">{copy.popular.heading}</p>
              <ul className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
                {copy.popular.items.map((p) => (
                  <li key={p.query} className="m-0">
                    <button
                      type="button"
                      title={copy.popular.title}
                      onClick={() => {
                        setQuery(p.query);
                        input.current?.focus();
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-pill bg-surface px-4 text-[0.9375rem] text-ink hover:bg-blue-soft"
                    >
                      <Search aria-hidden="true" size={16} className="text-ink-soft" />
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {shortcutLinks}
          </div>
        ) : found && found.hits.length > 0 ? (
          <div className="grid gap-1 pt-1">
            {found.partial ? <p className="m-0 px-3 py-2 text-sm text-ink-soft">{copy.results.partial}</p> : null}
            <p aria-hidden="true" className="m-0 px-3 text-xs text-ink-soft">
              {count}
            </p>
            <ul className="m-0 grid list-none gap-0.5 p-0">
              {found.hits.map((h) => (
                <li key={h.entry.h + h.entry.t} className="m-0">
                  <Result hit={h} words={found.words} copy={copy} onKey={onLinkKey} onPick={close} />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="grid gap-6 px-1 py-4">
            <div>
              <p className="m-0 text-lg font-medium text-balance">{copy.empty.heading.replace("{q}", query.trim())}</p>
              {fix ? (
                <p className="m-0 mt-3 text-ink-soft">
                  {copy.empty.didYouMean}{" "}
                  <button type="button" title={copy.empty.didYouMeanTitle.replace("{q}", fix)} onClick={() => setQuery(fix)} className="font-medium italic text-blue hover:underline">
                    {fix}
                  </button>
                </p>
              ) : null}
              <p className="m-0 mt-4 text-sm font-medium text-ink-soft">{copy.empty.tipsHeading}</p>
              <ul className="m-0 mt-1 list-disc pl-5 text-ink-soft">
                {copy.empty.tips.map((t) => (
                  <li key={t} className="mt-1">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            {shortcutLinks}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface p-4">
              <p className="m-0 text-ink-soft">{copy.empty.contact.text}</p>
              <a
                href={whatsappLink(copy.empty.contact.message.replace("{q}", query.trim()))}
                target="_blank"
                rel="noopener noreferrer"
                title={copy.empty.contact.title}
                className="inline-flex h-10 items-center gap-2 rounded-pill bg-blue px-5 font-medium text-on-blue no-underline hover:bg-blue-hover"
              >
                <MessageCircle aria-hidden="true" size={18} />
                {copy.empty.contact.label}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Result({ hit, words, copy, onKey, onPick }: { hit: Hit; words: string[]; copy: Copy; onKey: (e: KeyboardEvent<HTMLAnchorElement>) => void; onPick: () => void }) {
  const { entry } = hit;
  const Icon = ICON[entry.k];
  const where = entry.k === "page" ? entry.p : `${entry.p} · ${copy.kinds[entry.k]}`;
  // El extracto no repite el titulo cuando la entrada es una pagina o una pregunta (el texto empieza igual).
  const text = excerpt(entry.x, words);
  return (
    <NextLink
      href={entry.h}
      data-result=""
      onKeyDown={onKey}
      onClick={onPick}
      title={copy.results.linkTitle.replace("{title}", entry.t).replace("{page}", entry.p)}
      className="group grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 rounded-2xl px-3 py-3 no-underline hover:bg-surface focus-visible:bg-surface"
    >
      <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-blue-soft text-blue">
        <Icon size={20} />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="text-lg leading-snug text-blue group-hover:underline">
          <Marked text={entry.t} words={words} />
        </span>
        <span className="text-xs text-ink-soft">{where}</span>
        {text ? (
          <span className="line-clamp-2 text-sm text-ink-soft">
            <Marked text={text} words={words} />
          </span>
        ) : null}
      </span>
    </NextLink>
  );
}
