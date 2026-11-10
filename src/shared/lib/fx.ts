import "server-only";
import { z } from "@/shared/lib/z";
import { FALLBACK_FX, type FxRates } from "./money";

/**
 * Tipo de cambio desde APIs publicas y gratuitas, sin clave. Cada dato tiene dos fuentes independientes:
 *   USD/CLP: open.er-api.com, y como respaldo api.gael.cloud (dolar observado)
 *   UF:      api.boostr.cl, y como respaldo api.gael.cloud
 * La respuesta se cachea una hora en el cache de datos de Next. Si ninguna fuente responde, se usan valores
 * aproximados y `live` queda en false (el sitio lo declara en las condiciones de precios).
 * Toda respuesta externa se valida con Zod y se acota a un rango plausible antes de usarla.
 */
const REVALIDATE_SECONDS = 3600;
const TIMEOUT_MS = 4000;

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS), next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`${new URL(url).host} respondio ${res.status}`);
  return res.json();
}

const usdRange = z.number().min(300).max(3000);
const ufRange = z.number().min(20_000).max(80_000);

const erApi = z.object({ result: z.literal("success"), rates: z.object({ CLP: usdRange }) });
const boostr = z.object({ status: z.literal("success"), data: z.object({ value: ufRange }) });
const gael = z.array(z.object({ Codigo: z.string(), Valor: z.string() }));

/** "41268,88" -> 41268.88 (formato chileno, sin separador de miles en esta API). */
const fromChilean = (v: string) => Number(v.replaceAll(".", "").replace(",", "."));
const gaelValue = (rows: z.infer<typeof gael>, code: string) => {
  const row = rows.find((r) => r.Codigo.trim() === code);
  return row ? fromChilean(row.Valor) : Number.NaN;
};

const first = async <T>(attempts: (() => Promise<T>)[]): Promise<T | null> => {
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch {
      // se prueba la siguiente fuente
    }
  }
  return null;
};

export async function getFxRates(): Promise<FxRates> {
  const gaelRows = () => getJson("https://api.gael.cloud/general/public/monedas").then((j) => gael.parse(j));

  const [usdClp, ufClp] = await Promise.all([
    first<number>([
      async () => erApi.parse(await getJson("https://open.er-api.com/v6/latest/USD")).rates.CLP,
      async () => usdRange.parse(gaelValue(await gaelRows(), "USD")),
    ]),
    first<number>([
      async () => boostr.parse(await getJson("https://api.boostr.cl/economy/indicator/uf.json")).data.value,
      async () => ufRange.parse(gaelValue(await gaelRows(), "UF")),
    ]),
  ]);

  if (usdClp === null || ufClp === null) {
    console.warn("[fx] sin tipo de cambio en vivo: se usan valores aproximados");
    return { ...FALLBACK_FX, usdClp: usdClp ?? FALLBACK_FX.usdClp, ufClp: ufClp ?? FALLBACK_FX.ufClp, live: false };
  }
  return { usdClp, ufClp, date: new Date().toISOString().slice(0, 10), live: true };
}
