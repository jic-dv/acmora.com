"use client";

import { ArrowUpRight, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import type { ProjectCardItem, ProjectFilters } from "@/shared/lib/doc";

type Filter = "all" | "production" | "demo";

/**
 * Listado de proyectos estilo Google (Material): filtros en chips y tarjetas elevadas con portada 16:9, estado, fecha,
 * titulo, descripcion, etiquetas y un enlace al sitio. Toda la tarjeta es clicable (el enlace se estira sobre ella) y
 * sube su elevacion al pasar el cursor. Los proyectos llegan ordenados del mas reciente al mas antiguo.
 */
export default function ProjectsGrid({ items, filters }: { items: ProjectCardItem[]; filters: ProjectFilters }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = filter === "all" ? items : items.filter((p) => p.status === filter);
  const count = (f: Filter) => (f === "all" ? items.length : items.filter((p) => p.status === f).length);
  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: filters.all },
    { id: "production", label: filters.production },
    { id: "demo", label: filters.demo },
  ];

  return (
    <div className="mt-8">
      <div role="group" aria-label={filters.label} className="flex flex-wrap items-center gap-2">
        {chips.map((c) => {
          const on = filter === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              title={`${filters.label}: ${c.label}`}
              onClick={() => setFilter(c.id)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors duration-(--duration-enter)",
                on ? "border-transparent bg-blue-soft text-blue" : "border-outline text-ink hover:bg-surface",
              )}
            >
              {on ? <Check aria-hidden="true" size={16} /> : null}
              {c.label}
              <span className="text-ink-soft">{count(c.id)}</span>
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="mt-4 text-sm text-ink-soft">
        {filters.shown.replace("{n}", String(shown.length))}
      </p>

      <ul className="mt-4 grid max-w-none list-none gap-6 pl-0 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p, i) => (
          <li
            key={p.slug}
            className="group relative mt-0 flex max-w-none flex-col overflow-hidden rounded-card bg-paper shadow-card transition-shadow duration-(--duration-enter) hover:shadow-raised has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-light"
          >
            <div className="relative aspect-video overflow-hidden bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element -- next/image escribe un atributo style en el HTML, que la CSP (sin unsafe-inline) bloquea; la imagen ya viene optimizada en WebP (portadas de 960 px). */}
              <img
                src={p.cover}
                alt={p.coverAlt}
                title={p.coverTitle}
                width={960}
                height={540}
                loading={i < 3 ? "eager" : "lazy"}
                fetchPriority={i < 3 ? "high" : "auto"}
                decoding="async"
                className="absolute inset-0 size-full object-cover object-top transition-transform duration-500 ease-(--ease-standard) group-hover:scale-[1.03]"
              />
              <span
                className={cn(
                  "absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-medium shadow-sm",
                  p.status === "production" ? "bg-green-soft text-add" : "bg-orange-soft text-orange-deep",
                )}
              >
                <span aria-hidden="true" className={cn("size-1.5 rounded-full", p.status === "production" ? "bg-add" : "bg-orange-deep")} />
                {p.statusLabel}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <time dateTime={p.dateIso} className="text-sm text-ink-soft">
                {p.date}
              </time>
              <h3 className="mt-2 text-xl font-medium leading-snug text-balance">{p.title}</h3>
              <p className="mt-2 line-clamp-4 text-[0.9375rem] text-ink-soft">{p.description}</p>
              <ul className="mt-4 flex max-w-none list-none flex-wrap gap-2 pl-0">
                {p.tags.map((t) => (
                  <li key={t} className="mt-0 max-w-none rounded-lg border border-outline px-2.5 py-0.5 text-xs text-ink-soft">
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                <span className="truncate text-sm text-ink-soft">{p.host}</span>
                {/* El enlace se estira sobre toda la tarjeta (after:inset-0): un solo destino, una sola parada de teclado. */}
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={p.linkTitle}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-pill px-4 text-sm font-medium text-blue no-underline after:absolute after:inset-0 after:content-[''] hover:bg-blue-soft"
                >
                  {p.linkLabel}
                  <ArrowUpRight aria-hidden="true" size={18} />
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
