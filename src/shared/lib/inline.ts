import { getPathname } from "@/i18n/navigation";
import { routing, type AppPathname, type Locale } from "@/i18n/routing";

export type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; title: string | undefined; target: string };

const PATTERN = /\[([^\]|]+)(?:\|([^\]]+))?\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;

export function parseInline(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  for (const m of input.matchAll(PATTERN)) {
    const index = m.index ?? 0;
    if (index > last) tokens.push({ kind: "text", text: input.slice(last, index) });
    if (m[1] !== undefined && m[3] !== undefined) {
      tokens.push({ kind: "link", text: m[1], title: m[2], target: m[3] });
    } else if (m[4] !== undefined) {
      tokens.push({ kind: "strong", text: m[4] });
    } else if (m[5] !== undefined) {
      tokens.push({ kind: "code", text: m[5] });
    }
    last = index + m[0].length;
  }
  if (last < input.length) tokens.push({ kind: "text", text: input.slice(last) });
  return tokens;
}

export type ResolvedTarget = { href: string; kind: "internal" | "external" | "mail" | "tel" };

const isAppPathname = (value: string): value is AppPathname => value in routing.pathnames;

export function resolveTarget(target: string, locale: Locale): ResolvedTarget {
  if (target.startsWith("page:")) {
    const [rawPath = "/", hash] = target.slice(5).split("#");
    if (!isAppPathname(rawPath)) throw new Error(`Destino de pagina desconocido: ${target}`);
    const href = (rawPath === "/services/[slug]" ? "/services" : rawPath) as Exclude<AppPathname, "/services/[slug]">;
    return { href: getPathname({ locale, href }) + (hash ? `#${hash}` : ""), kind: "internal" };
  }
  if (target.startsWith("service:")) {
    const slug = target.slice(8);
    return { href: getPathname({ locale, href: { pathname: "/services/[slug]", params: { slug } } }), kind: "internal" };
  }
  if (target.startsWith("mailto:")) return { href: target, kind: "mail" };
  if (target.startsWith("tel:")) return { href: target, kind: "tel" };
  if (/^https:\/\//.test(target)) return { href: target, kind: "external" };
  throw new Error(`Destino de enlace no permitido: ${target}`);
}
