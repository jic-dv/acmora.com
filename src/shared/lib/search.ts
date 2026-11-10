/**
 * Busqueda del sitio: indice compacto (una entrada por pagina, seccion y pregunta frecuente) y funciones puras para
 * ordenar, extractar y resaltar. Sin dependencias del DOM ni de Zod (el esquema vive en search-schema.ts y el cliente lo
 * descarga recien al abrir el buscador).
 *   t = titulo, p = pagina o categoria, h = destino (ruta localizada con #ancla), x = texto plano, k = tipo.
 */
export type SearchEntry = { t: string; p: string; h: string; x: string; k: "page" | "section" | "faq" };

/** Minusculas y sin tildes ("mantencion" encuentra "mantención"). Conserva el largo del texto con caracteres precompuestos. */
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const STOP = new Set(
  "de del la las el los un una unos unas y o u en para por con sin que cual cuales como cuanto cuanta es son mi mis tu tus se lo al a the an and or of to for in on is are my do does how what which much with your it".split(" "),
);

/** Palabras de la consulta sin tildes ni palabras vacias ("cuanto cuesta una pagina" -> cuesta, pagina). */
export function words(query: string): string[] {
  const all = fold(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const useful = all.filter((w) => !STOP.has(w));
  return Array.from(new Set(useful.length > 0 ? useful : all));
}

export type Indexed = { entry: SearchEntry; t: string; p: string; x: string };
export const prepare = (entries: SearchEntry[]): Indexed[] => entries.map((entry) => ({ entry, t: fold(entry.t), p: fold(entry.p), x: fold(entry.x) }));

export type Hit = { entry: SearchEntry; score: number; matched: number };
export type Found = { hits: Hit[]; partial: boolean; words: string[] };

const KIND_BONUS = { page: 3, section: 1, faq: 2 } as const;
const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function scoreOf(item: Indexed, ws: string[], phrase: string): Hit {
  let score = 0;
  let matched = 0;
  for (const w of ws) {
    const inTitle = item.t.includes(w);
    const inPage = item.p.includes(w);
    const inText = item.x.includes(w);
    if (!inTitle && !inPage && !inText) continue;
    matched++;
    if (inTitle) score += new RegExp(`(^|[^\\p{L}\\p{N}])${escape(w)}`, "u").test(item.t) ? 10 : 6;
    if (inPage) score += 3;
    if (inText) score += 1 + Math.min(3, item.x.split(w).length - 2);
  }
  if (phrase && item.t.includes(phrase)) score += 8;
  return { entry: item.entry, score: score + (matched > 0 ? KIND_BONUS[item.entry.k] : 0), matched };
}

/** Entradas que traen todas las palabras; si no hay ninguna, las que traen alguna (partial), de mas a menos coincidencias. */
export function search(index: Indexed[], query: string, limit = 8): Found {
  const ws = words(query);
  if (ws.length === 0) return { hits: [], partial: false, words: ws };
  const phrase = ws.length > 1 ? ws.join(" ") : "";
  const scored = index.map((item) => scoreOf(item, ws, phrase)).filter((h) => h.matched > 0);
  const byScore = (a: Hit, b: Hit) => b.score - a.score;
  const full = scored.filter((h) => h.matched === ws.length).sort(byScore);
  if (full.length > 0 || ws.length < 2) return { hits: full.slice(0, limit), partial: false, words: ws };
  return { hits: scored.sort((a, b) => b.matched - a.matched || byScore(a, b)).slice(0, limit), partial: true, words: ws };
}

/** Fragmento del texto donde aparece la primera palabra, cortado en limites de palabra. */
export function excerpt(text: string, ws: string[], max = 150): string {
  if (text.length <= max) return text;
  const folded = fold(text);
  const at = ws.map((w) => folded.indexOf(w)).filter((i) => i >= 0);
  const first = at.length > 0 ? Math.min(...at) : 0;
  let start = Math.max(0, first - 40);
  if (start > 0) {
    const space = text.indexOf(" ", start);
    start = space >= 0 && space < first ? space + 1 : start;
  }
  let end = Math.min(text.length, start + max);
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    end = space > start + max / 2 ? space : end;
  }
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

export type Piece = { text: string; hit: boolean };

/** Parte el texto en trozos, marcando los que contienen alguna palabra buscada (sin importar tildes ni mayusculas). */
export function highlight(text: string, ws: string[]): Piece[] {
  const folded = fold(text);
  if (folded.length !== text.length || ws.length === 0) return [{ text, hit: false }];
  const marks = new Array<boolean>(text.length).fill(false);
  for (const w of ws) {
    for (let i = folded.indexOf(w); i >= 0; i = folded.indexOf(w, i + w.length)) marks.fill(true, i, i + w.length);
  }
  const out: Piece[] = [];
  for (let i = 0; i < text.length; i++) {
    const hit = marks[i] === true;
    const last = out[out.length - 1];
    if (last && last.hit === hit) last.text += text.charAt(i);
    else out.push({ text: text.charAt(i), hit });
  }
  return out;
}

function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length] ?? 0;
}

/** "Quizas quisiste decir": corrige palabras que no aparecen en ningun lugar usando el vocabulario del propio sitio. */
export function suggest(index: Indexed[], query: string): string | null {
  const ws = words(query);
  const vocab = new Map<string, string>();
  for (const { entry } of index) {
    for (const raw of `${entry.t} ${entry.x}`.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (raw.length >= 4 && !vocab.has(fold(raw))) vocab.set(fold(raw), raw);
    }
  }
  let changed = false;
  const fixed = ws.map((w) => {
    if (w.length < 4 || index.some((i) => i.t.includes(w) || i.x.includes(w))) return w;
    const limit = w.length >= 8 ? 2 : 1;
    let best: { word: string; d: number } | null = null;
    for (const [key, original] of vocab) {
      if (Math.abs(key.length - w.length) > limit) continue;
      const d = distance(w, key);
      if (d <= limit && (!best || d < best.d)) best = { word: original, d };
    }
    if (!best) return w;
    changed = true;
    return best.word;
  });
  return changed ? fixed.join(" ") : null;
}
