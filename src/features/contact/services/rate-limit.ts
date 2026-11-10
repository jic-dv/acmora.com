import "server-only";

/**
 * Limitador de ventana fija en memoria. Suficiente para una instancia; en serverless cada
 * instancia tiene su propio contador, asi que en produccion se reemplaza por un almacen
 * compartido (Upstash Redis, Vercel KV) conservando esta misma firma.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  const entry = hits.get(key);
  if (!entry) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}
