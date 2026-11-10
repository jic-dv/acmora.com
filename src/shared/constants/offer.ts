/**
 * Capacidad real de Acmora: cuantos proyectos nuevos se toman por mes y cuantos ya se confirmaron en el mes indicado.
 * Es la unica fuente de la escasez que muestra el sitio, y debe ser verdad (la Ley del Consumidor sanciona la publicidad
 * enganosa): cuando confirmes un proyecto, sube `taken` y deja `month` en el mes en curso (AAAA-MM, hora de Chile).
 * Si `month` no es el mes en curso, el sitio asume que el mes recien empezo y muestra todos los cupos libres.
 */
export const CAPACITY = { perMonth: 3, taken: 0, month: "2026-11" } as const;

/** Mes en curso en Chile, como AAAA-MM. */
export function monthKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit" }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  return `${y}-${m}`;
}

/** Cupos del mes en curso: tomados (del archivo solo si es el mismo mes) y libres. */
export function capacityNow(date: Date) {
  const taken = CAPACITY.month === monthKey(date) ? Math.min(CAPACITY.taken, CAPACITY.perMonth) : 0;
  return { total: CAPACITY.perMonth, taken, left: CAPACITY.perMonth - taken };
}
